// components/fragments/tags/MetaTagsSelector.tsx
'use client'
import React from 'react';

interface MetaTag {
  id: string;
  name: string;
  icon: string;
}

interface MetaTagsSelectorProps {
  metaTags: MetaTag[];
  selectedMetaTags: MetaTag[];
  onAddMetaTag: (tag: MetaTag) => void;
}

const MetaTagsSelector: React.FC<MetaTagsSelectorProps> = ({
  metaTags,
  selectedMetaTags,
  onAddMetaTag
}) => {
  return (
    <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="text-xs text-gray-500 mb-1">特殊標籤過濾:</div>
      <div className="flex flex-wrap gap-2">
        {metaTags.map(tag => (
          <button
            key={tag.id}
            onClick={() => onAddMetaTag(tag)}
            className={`px-2 py-1 text-xs ${
              selectedMetaTags.some(t => t.id === tag.id)
                ? 'bg-blue-200 hover:bg-blue-300 border border-blue-300'
                : 'bg-gray-100 hover:bg-gray-200 border border-gray-300'
            } rounded-full flex items-center gap-1`}
          >
            <span>{tag.icon}</span>
            <span>{tag.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MetaTagsSelector;