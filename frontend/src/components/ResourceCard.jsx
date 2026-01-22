import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const ResourceCard = ({ title, data, type, icon: Icon }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Icon className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      <div className={`space-y-3 ${expanded ? '' : 'max-h-32 overflow-hidden'}`}>
        {data.map((item, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-gray-800">{item.label}</p>
              <p className="text-sm text-gray-600 mt-1">{item.value}</p>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!expanded && data.length > 2 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-sm text-green-600 hover:text-green-700 mt-3 flex items-center space-x-1"
        >
          <span>Show more</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};