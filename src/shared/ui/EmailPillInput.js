'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';

const EmailPillInput = ({ 
  value = [], 
  onChange, 
  placeholder = "Enter email addresses...", 
  mode = "light",
  className = "" 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef(null);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateEmail = (email) => {
    return emailRegex.test(email.trim());
  };

  const addEmail = (email) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !value.includes(trimmedEmail)) {
      if (validateEmail(trimmedEmail)) {
        onChange([...value, trimmedEmail]);
        setInputValue('');
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    } else if (trimmedEmail) {
      setInputValue('');
    }
  };

  const removeEmail = (emailToRemove) => {
    onChange(value.filter(email => email !== emailToRemove));
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsValid(true);

    // Check if user typed a comma or semicolon
    if (newValue.includes(',') || newValue.includes(';')) {
      const emails = newValue.split(/[,;]/).filter(email => email.trim());
      emails.forEach(email => {
        if (email.trim()) {
          addEmail(email);
        }
      });
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (inputValue.trim()) {
        addEmail(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last email when backspace is pressed on empty input
      removeEmail(value[value.length - 1]);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const emails = pastedText.split(/[,;\s\n]/).filter(email => email.trim());
    
    emails.forEach(email => {
      if (email.trim()) {
        addEmail(email);
      }
    });
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div
        onClick={handleContainerClick}
        className={`min-h-[42px] w-full px-3 py-2 border rounded-lg cursor-text transition-all duration-200 ${
          !isValid 
            ? 'border-red-500 ring-2 ring-red-200 shadow-sm' 
            : 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent focus-within:shadow-sm'
        } ${
          mode === "dark"
            ? "bg-gray-700 border-gray-600 text-white hover:border-gray-500"
            : "bg-white border-gray-300 text-gray-900 hover:border-gray-400"
        } ${className}`}
      >
        <div className="flex flex-wrap gap-2 items-center">
          {/* Email Pills */}
          {value.map((email, index) => (
            <div
              key={index}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === "dark"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
              }`}
            >
              <Icon icon="mdi:email" className="w-3 h-3 opacity-70" />
              <span>{email}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEmail(email);
                }}
                className={`ml-1 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5 transition-colors ${
                  mode === "dark" ? "hover:text-gray-200" : "hover:text-gray-600"
                }`}
                title="Remove email"
              >
                <Icon icon="mdi:close" className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={value.length === 0 ? placeholder : ""}
            className={`flex-1 min-w-[120px] outline-none bg-transparent ${
              mode === "dark" ? "text-white placeholder-gray-400" : "text-gray-900 placeholder-gray-500"
            }`}
          />
        </div>
      </div>
      
      {/* Helper Text */}
      <div className="flex items-center justify-between">
        <p className={`text-xs flex items-center gap-1 ${
          !isValid 
            ? "text-red-500" 
            : mode === "dark" ? "text-gray-400" : "text-gray-500"
        }`}>
          {!isValid ? (
            <>
              <Icon icon="mdi:alert-circle" className="w-3 h-3" />
              Please enter a valid email address
            </>
          ) : (
            <>
              <Icon icon="mdi:information" className="w-3 h-3" />
              Type email and press comma, semicolon, or Enter to add
            </>
          )}
        </p>
        
        {value.length > 0 && (
          <p className={`text-xs ${mode === "dark" ? "text-gray-400" : "text-gray-500"}`}>
            {value.length} recipient{value.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

export default EmailPillInput;