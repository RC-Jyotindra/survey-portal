"use client";

interface SurveyProgressProps {
  currentPage: number;
  totalPages: number;
}

export default function SurveyProgress({ currentPage, totalPages }: SurveyProgressProps) {
  const progress = (currentPage / totalPages) * 100;

  return (
    <div 
      className="px-8 py-4 border-b"
      style={{ 
        backgroundColor: 'var(--theme-surface)',
        borderBottomColor: 'var(--theme-border)'
      }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span 
            className="text-sm font-medium"
            style={{ color: 'var(--theme-text)' }}
          >
            Page {currentPage} of {totalPages}
          </span>
          <span 
            className="text-sm"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            {Math.round(progress)}% complete
          </span>
        </div>
        
        {/* Progress Bar */}
        <div 
          className="w-full rounded-full h-2"
          style={{ backgroundColor: 'var(--theme-border)' }}
        >
          <div
            className="progress-bar h-2 rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${progress}%`,
              backgroundColor: 'var(--theme-primary)'
            }}
          />
        </div>
        
        {/* Page Indicators */}
        <div className="flex justify-center mt-3 space-x-2">
          {Array.from({ length: totalPages }, (_, index) => (
            <div
              key={index}
              className="w-2 h-2 rounded-full transition-colors duration-200"
              style={{
                backgroundColor: index < currentPage
                  ? 'var(--theme-primary)'
                  : index === currentPage - 1
                  ? 'var(--theme-accent)'
                  : 'var(--theme-border)'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
