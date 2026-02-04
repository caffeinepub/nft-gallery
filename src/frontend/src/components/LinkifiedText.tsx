import React from 'react';

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  // URL regex pattern that matches http://, https://, and www. URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  const parts = text.split(urlRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if this part is a URL
        if (part.match(urlRegex)) {
          // Ensure the URL has a protocol
          const href = part.startsWith('http') ? part : `https://${part}`;
          
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline hover:text-primary/80 transition-colors break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        
        // Regular text - preserve line breaks
        return (
          <React.Fragment key={index}>
            {part.split('\n').map((line, lineIndex, array) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < array.length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      })}
    </span>
  );
}
