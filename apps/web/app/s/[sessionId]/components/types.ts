// Types for the survey runtime components

export interface ResolvedPage {
  pageId: string;
  title: string;
  description?: string;
  groups: ResolvedGroup[];
  isVisible: boolean;
}

export interface ResolvedGroup {
  id: string;
  title?: string;
  description?: string;
  questions: ResolvedQuestion[];
  isVisible: boolean;
  order: number;
}

export interface ResolvedQuestion {
  id: string;
  variableName: string;
  type: string;
  title: string;
  helpText?: string;
  required: boolean;
  options: ResolvedOption[];
  items?: ResolvedItem[];
  scales?: ResolvedScale[];
  validation?: any;
  isVisible: boolean;
  order: number;
  // Type-specific config
  minValue?: number;
  maxValue?: number;
  stepValue?: number;
  defaultValue?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  scaleSteps?: number;
  maxSelections?: number;
  allowOther?: boolean;
  otherLabel?: string;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  dateFormat?: string;
  timeFormat?: string;
  minDate?: Date;
  maxDate?: Date;
  phoneFormat?: string;
  countryCode?: string;
  urlProtocol?: string;
  paymentAmount?: number;
  currency?: string;
  paymentMethods?: string[];
  imageLayout?: string;
  imageSize?: string;
  matrixType?: string;
  showHeaders?: boolean;
  randomizeRows?: boolean;
  randomizeColumns?: boolean;
  totalPoints?: number;
  allowZero?: boolean;
  signatureWidth?: number;
  signatureHeight?: number;
  signatureColor?: string;
  consentText?: string;
  requireSignature?: boolean;
  collectName?: boolean;
  collectEmail?: boolean;
  collectPhone?: boolean;
  collectCompany?: boolean;
  collectAddress?: boolean;
  showIpsosBranding?: boolean;
  groupSize?: number;
  groupLabel?: string;
}

export interface ResolvedOption {
  id: string;
  value: string;
  label: string;
  exclusive?: boolean;
  groupKey?: string;
  weight?: number;
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  isVisible: boolean;
  order: number;
}

export interface ResolvedItem {
  id: string;
  value: string;
  label: string;
  order: number;
}

export interface ResolvedScale {
  id: string;
  value: string;
  label: string;
  order: number;
}

export interface ValidationViolation {
  questionId: string;
  code: string;
  message: string;
  field?: string;
}

export interface AnswerValue {
  choices?: string[];
  textValue?: string;
  numericValue?: number;
  decimalValue?: number;
  booleanValue?: boolean;
  emailValue?: string;
  phoneValue?: string;
  urlValue?: string;
  dateValue?: string;
  timeValue?: string;
  fileUrls?: string[];
  signatureUrl?: string;
  paymentId?: string;
  paymentStatus?: string;
  matrixValue?: { [itemId: string]: string | string[] | null };
  jsonValue?: any;
}
