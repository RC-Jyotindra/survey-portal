import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "@repo/database";
import { signAuthToken } from "../lib/jwt";
import { ProductCode, AssignmentRole } from "@prisma/client";
import { sendOtpEmail } from "../lib/mailer";

const router = Router();

/**
 * POST /auth/register/initiate
 * Body: { email, password, name, tenantName, tenantSlug, productCode }
 * Step 1: Creates signup intent and sends OTP email
 */
router.post("/register/initiate", async (req, res) => {
  try {
    const { email, password, name, tenantName, tenantSlug, productCode } = req.body || {};
    if (!email || !password || !tenantName || !tenantSlug || !productCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const code: ProductCode = productCode; // must be SB | PM | PMM

    // Check if user or tenant already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: "Email already registered" });

    const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existingTenant) return res.status(409).json({ error: "Tenant slug already in use" });

    const product = await prisma.product.findUnique({ where: { code } });
    if (!product) return res.status(400).json({ error: "Unknown productCode" });

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    // Create signup intent
    const intent = await prisma.signupIntent.create({
      data: {
        email,
        passwordHash,
        name,
        tenantName,
        tenantSlug,
        productCode: code,
        status: "PENDING",
        expiresAt,
      },
    });

    // Generate OTP (6 digits)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);

    // Store OTP
    await prisma.emailOtp.create({
      data: {
        signupIntentId: intent.id,
        codeHash: otpHash,
        purpose: "SIGNUP_EMAIL",
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000), // 10 minutes
        attempts: 0,
      },
    });

    // Send OTP email
    try {
      await sendOtpEmail(email, otpCode);
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Still return success but log the error
    }

    return res.status(200).json({ 
      message: "Verification code sent to your email",
      intentId: intent.id
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Registration initiation failed" });
  }
});

/**
 * POST /auth/register/verify
 * Body: { intentId, code }
 * Step 2: Verifies OTP and creates user/tenant/membership
 */
router.post("/register/verify", async (req, res) => {
  try {
    const { intentId, code } = req.body || {};
    if (!intentId || !code) {
      return res.status(400).json({ error: "intentId and code required" });
    }

    // Find and validate intent
    const intent = await prisma.signupIntent.findUnique({ 
      where: { id: intentId } 
    });
    
    if (!intent || intent.status !== "PENDING" || intent.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired signup intent" });
    }

    // Find active OTP
    const otp = await prisma.emailOtp.findFirst({
      where: { 
        signupIntentId: intentId, 
        purpose: "SIGNUP_EMAIL", 
        consumedAt: null 
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return res.status(400).json({ error: "No active verification code found" });
    }

    if (otp.expiresAt < new Date()) {
      return res.status(400).json({ error: "Verification code has expired" });
    }

    if (otp.attempts >= 3) {
      return res.status(429).json({ error: "Too many attempts. Please request a new code." });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      // Increment attempt count
      await prisma.emailOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(401).json({ error: "Invalid verification code" });
    }

    // OTP is valid - create user, tenant, and membership
    const now = new Date();
    const result = await prisma.$transaction(async (tx: any) => {
      // Mark OTP as consumed and intent as completed
      await tx.emailOtp.update({ 
        where: { id: otp.id }, 
        data: { consumedAt: now } 
      });
      
      await tx.signupIntent.update({ 
        where: { id: intent.id }, 
        data: { status: "COMPLETED" } 
      });

      // Double-check email isn't taken (race condition protection)
      const existingUser = await tx.user.findUnique({ where: { email: intent.email } });
      if (existingUser) throw new Error("Email already registered");

      // Get product for tenant product creation
      const product = await tx.product.findUnique({ where: { code: intent.productCode } });
      if (!product) throw new Error("Product not found");

      // Create user
      const user = await tx.user.create({
        data: { 
          email: intent.email, 
          passwordHash: intent.passwordHash, 
          name: intent.name 
        },
      });

      // Create tenant
      const tenant = await tx.tenant.create({
        data: { 
          name: intent.tenantName, 
          slug: intent.tenantSlug, 
          tierCode: "FREE" 
        },
      });

      // Create membership
      const membership = await tx.tenantMembership.create({
        data: { 
          tenantId: tenant.id, 
          userId: user.id 
        },
      });

      // Create tenant product
      const tenantProduct = await tx.tenantProduct.create({
        data: { 
          tenantId: tenant.id, 
          productId: product.id, 
          status: "active", 
          licenseStart: now 
        },
      });

      // Assign owner role
      await tx.roleAssignment.create({
        data: {
          membershipId: membership.id,
          tenantProductId: tenantProduct.id,
          role: AssignmentRole.OWNER,
        },
      });

      // Build products claim
      const products = [{
        code: intent.productCode,
        role: AssignmentRole.OWNER,
      }];

      const token = signAuthToken({
        userId: user.id,
        tenantId: tenant.id,
        products,
      });

      return { token, user, tenant, products };
    });

    return res.status(201).json(result);

  } catch (err: any) {
    console.error(err);
    
    // Handle specific errors
    if (err.message?.includes("Email already registered")) {
      return res.status(409).json({ error: "Email already registered" });
    }
    
    return res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * POST /auth/register (Legacy - kept for backward compatibility)
 * Body: { email, password, name, tenantName, tenantSlug, productCode }
 * Creates User, Tenant, Membership, ensures TenantProduct for productCode,
 * assigns OWNER to the creator for that product, returns JWT with all products for that tenant.
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, tenantName, tenantSlug, productCode } = req.body || {};
    if (!email || !password || !tenantName || !tenantSlug || !productCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const code: ProductCode = productCode; // must be SB | PM | PMM

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: "Email already registered" });

    const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existingTenant) return res.status(409).json({ error: "Tenant slug already in use" });

    const passwordHash = await bcrypt.hash(password, 10);

    const product = await prisma.product.findUnique({ where: { code } });
    if (!product) return res.status(400).json({ error: "Unknown productCode" });

    const now = new Date();

    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: { email, passwordHash, name },
      });

      const tenant = await tx.tenant.create({
        data: { name: tenantName, slug: tenantSlug, tierCode: "FREE" },
      });

      const membership = await tx.tenantMembership.create({
        data: { tenantId: tenant.id, userId: user.id },
      });

      // ensure tenant has this product active
      const tenantProduct = await tx.tenantProduct.upsert({
        where: { tenantId_productId: { tenantId: tenant.id, productId: product.id } },
        update: { status: "active", licenseEnd: null },
        create: { tenantId: tenant.id, productId: product.id, status: "active", licenseStart: now },
      });

      // grant creator OWNER for this product
      await tx.roleAssignment.upsert({
        where: { membershipId_tenantProductId: { membershipId: membership.id, tenantProductId: tenantProduct.id } },
        update: { role: AssignmentRole.OWNER },
        create: { membershipId: membership.id, tenantProductId: tenantProduct.id, role: AssignmentRole.OWNER },
      });

      // build claims for all active products in this tenant
      const ras = await prisma.roleAssignment.findMany({
        where: {
          membershipId: membership.id,
          tenantProduct: {
            status: "active",
            OR: [{ licenseEnd: null }, { licenseEnd: { gt: now } }],
          },
        },
        include: { tenantProduct: { include: { product: true } } },
      });

      const products = ras.map((ra: any) => ({
        code: ra.tenantProduct.product.code,
        role: ra.role,
      }));

      const token = signAuthToken({
        userId: user.id,
        tenantId: tenant.id,
        products,
      });

      return { token, user, tenant, products };
    });

    return res.status(201).json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /auth/verify-credentials
 * Body: { email, password }
 * Step 1: Verify credentials and return available tenant/product combinations
 */
router.post("/verify-credentials", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const now = new Date();

    // Get all active memberships and their available products
    const memberships = await prisma.tenantMembership.findMany({
      where: { 
        userId: user.id, 
        isActive: true,
        tenant: { isActive: true }
      },
      include: {
        tenant: true,
        roleAssignments: {
          where: {
            tenantProduct: {
              status: "active",
              OR: [{ licenseEnd: null }, { licenseEnd: { gt: now } }]
            }
          },
          include: {
            tenantProduct: {
              include: { product: true }
            }
          }
        }
      }
    });

    // Build available options
    const availableOptions = memberships.map(membership => ({
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug
      },
      products: membership.roleAssignments.map(ra => ({
        code: ra.tenantProduct.product.code,
        name: ra.tenantProduct.product.name,
        role: ra.role
      }))
    })).filter(option => option.products.length > 0); // Only show tenants with accessible products

    if (availableOptions.length === 0) {
      return res.status(403).json({ error: "No active product access found" });
    }

    // If user has only one option, auto-select it
    if (availableOptions.length === 1 && availableOptions[0]?.products.length === 1) {
      const option = availableOptions[0]!; // Safe to use ! since we checked length === 1
      
      const token = signAuthToken({
        userId: user.id,
        tenantId: option.tenant.id,
        products: option.products,
      });

      return res.json({ 
        autoLogin: true,
        token, 
        user: { id: user.id, email: user.email, name: user.name }, 
        tenant: option.tenant, 
        products: option.products 
      });
    }

    return res.json({ 
      requiresSelection: true,
      user: { id: user.id, email: user.email, name: user.name },
      availableOptions 
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Credential verification failed" });
  }
});

/**
 * POST /auth/complete-login
 * Body: { email, tenantId, productCode }
 * Step 2: Complete login with selected tenant/product
 */
router.post("/complete-login", async (req, res) => {
  try {
    const { email, tenantId, productCode } = req.body || {};
    if (!email || !tenantId || !productCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid user" });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || !tenant.isActive) return res.status(403).json({ error: "Tenant not found or inactive" });

    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    });
    if (!membership || !membership.isActive) return res.status(403).json({ error: "Not a member of this tenant" });

    const now = new Date();

    // Verify user has access to the requested product
    const raForRequested = await prisma.roleAssignment.findFirst({
      where: {
        membershipId: membership.id,
        tenantProduct: {
          tenantId: tenant.id,
          product: { code: productCode as ProductCode },
          status: "active",
          OR: [{ licenseEnd: null }, { licenseEnd: { gt: now } }],
        },
      },
      include: { tenantProduct: { include: { product: true } } },
    });

    if (!raForRequested) {
      return res.status(403).json({ error: `No access to ${productCode} for this tenant` });
    }

    // Build claims for *all* active products for this membership
    const ras = await prisma.roleAssignment.findMany({
      where: {
        membershipId: membership.id,
        tenantProduct: { status: "active", OR: [{ licenseEnd: null }, { licenseEnd: { gt: now } }] },
      },
      include: { tenantProduct: { include: { product: true } } },
    });

    const products = ras.map((ra: any) => ({
      code: ra.tenantProduct.product.code,
      role: ra.role,
    }));

    const token = signAuthToken({
      userId: user.id,
      tenantId: tenant.id,
      products,
    });

    return res.json({ token, user: { id: user.id, email: user.email, name: user.name }, tenant, products });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Login completion failed" });
  }
});

/**
 * POST /auth/login (Legacy - kept for backward compatibility)
 * Body: { email, password, tenantSlug, productCode }
 * Verifies membership & product access; returns JWT with all products (for that tenant).
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password, tenantSlug, productCode } = req.body || {};
    if (!email || !password || !tenantSlug || !productCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const code: ProductCode = productCode; // must be SB | PM | PMM
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || !tenant.isActive) return res.status(403).json({ error: "Tenant not found or inactive" });

    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    });
    if (!membership || !membership.isActive) return res.status(403).json({ error: "Not a member of this tenant" });

    const now = new Date();

    // Ensure user has access to the requested product
    const raForRequested = await prisma.roleAssignment.findFirst({
      where: {
        membershipId: membership.id,
        tenantProduct: {
          tenantId: tenant.id,
          product: { code },
          status: "active",
          OR: [{ licenseEnd: null }, { licenseEnd: { gt: now } }],
        },
      },
      include: { tenantProduct: { include: { product: true } } },
    });

    if (!raForRequested) {
      return res.status(403).json({ error: `No access to ${productCode} for this tenant` });
    }

    // Build claims for *all* active products for this membership
    const ras = await prisma.roleAssignment.findMany({
      where: {
        membershipId: membership.id,
        tenantProduct: { status: "active", OR: [{ licenseEnd: null }, { licenseEnd: { gt: now } }] },
      },
      include: { tenantProduct: { include: { product: true } } },
    });

    const products = ras.map((ra: any) => ({
      code: ra.tenantProduct.product.code,
      role: ra.role,
    }));

    const token = signAuthToken({
      userId: user.id,
      tenantId: tenant.id,
      products,
    });

    return res.json({ token, user: { id: user.id, email: user.email, name: user.name }, tenant, products });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/**
 * GET /auth/me
 * Header: Authorization: Bearer <token>
 * Returns the decoded identity (basic) + products (from token)
 */
router.get("/me", (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Missing token" });

    // In v1 we trust the token; for stricter flows you can re-hydrate from DB.
    const payload = require("../lib/jwt").verifyAuthToken(token);
    return res.json(payload);
  } catch (err: any) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

/**
 * POST /auth/switch-tenant
 * Body: { tenantSlug }
 * Re-issues a token scoped to another tenant (if user is a member).
 */
router.post("/switch-tenant", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Missing token" });

    const { sub: userId } = require("../lib/jwt").verifyAuthToken(token);
    const { tenantSlug } = req.body || {};
    if (!tenantSlug) return res.status(400).json({ error: "tenantSlug required" });

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) return res.status(404).json({ error: "Tenant not found" });

    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId } },
    });
    if (!membership) return res.status(403).json({ error: "Not a member of this tenant" });

    const now = new Date();
    const ras = await prisma.roleAssignment.findMany({
      where: {
        membershipId: membership.id,
        tenantProduct: { status: "active", OR: [{ licenseEnd: null }, { licenseEnd: { gt: now } }] },
      },
      include: { tenantProduct: { include: { product: true } } },
    });

    const products = ras.map((ra: any) => ({
      code: ra.tenantProduct.product.code,
      role: ra.role,
    }));

    const newToken = signAuthToken({ userId, tenantId: tenant.id, products });

    return res.json({ token: newToken, tenant, products });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Switch tenant failed" });
  }
});

/** v1 noop (if you move to cookies, clear cookie here) */
router.post("/logout", (_, res) => res.json({ ok: true }));

export default router;
