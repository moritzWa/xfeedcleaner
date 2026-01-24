import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import {
  DEFAULT_BAD_CRITERIA,
  DEFAULT_GOOD_CRITERIA,
  DEFAULT_HIGHLIGHT_CRITERIA,
} from '@/lib/constants';

interface CriteriaState {
  bad: string;
  good: string;
  highlight: string;
}

export function PromptsSettings() {
  const [criteria, setCriteria] = useState<CriteriaState>({
    bad: DEFAULT_BAD_CRITERIA,
    good: DEFAULT_GOOD_CRITERIA,
    highlight: DEFAULT_HIGHLIGHT_CRITERIA,
  });

  const [isDefault, setIsDefault] = useState({
    bad: true,
    good: true,
    highlight: true,
  });

  useEffect(() => {
    chrome.storage.sync.get(
      ['badCriteria', 'goodCriteria', 'highlightCriteria'],
      (result) => {
        setCriteria({
          bad: result.badCriteria || DEFAULT_BAD_CRITERIA,
          good: result.goodCriteria || DEFAULT_GOOD_CRITERIA,
          highlight: result.highlightCriteria || DEFAULT_HIGHLIGHT_CRITERIA,
        });
        setIsDefault({
          bad: !result.badCriteria || result.badCriteria === DEFAULT_BAD_CRITERIA,
          good: !result.goodCriteria || result.goodCriteria === DEFAULT_GOOD_CRITERIA,
          highlight: !result.highlightCriteria || result.highlightCriteria === DEFAULT_HIGHLIGHT_CRITERIA,
        });
      }
    );
  }, []);

  const handleChange = (
    type: 'bad' | 'good' | 'highlight',
    value: string
  ) => {
    setCriteria((prev) => ({ ...prev, [type]: value }));

    const defaults = {
      bad: DEFAULT_BAD_CRITERIA,
      good: DEFAULT_GOOD_CRITERIA,
      highlight: DEFAULT_HIGHLIGHT_CRITERIA,
    };
    setIsDefault((prev) => ({ ...prev, [type]: value === defaults[type] }));

    const storageKey = {
      bad: 'badCriteria',
      good: 'goodCriteria',
      highlight: 'highlightCriteria',
    }[type];
    chrome.storage.sync.set({ [storageKey]: value });
  };

  const resetToDefault = (type: 'bad' | 'good' | 'highlight') => {
    const defaults = {
      bad: DEFAULT_BAD_CRITERIA,
      good: DEFAULT_GOOD_CRITERIA,
      highlight: DEFAULT_HIGHLIGHT_CRITERIA,
    };
    handleChange(type, defaults[type]);
  };

  return (
    <div className="space-y-8">
      {/* Filter Criteria */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-gray-900 font-semibold">Filter Criteria</Label>
            <p className="text-xs text-gray-500 mt-0.5">Tweets matching these will be blurred/hidden</p>
          </div>
          {!isDefault.bad && (
            <button
              onClick={() => resetToDefault('bad')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Reset
            </button>
          )}
        </div>
        <textarea
          value={criteria.bad}
          onChange={(e) => handleChange('bad', e.target.value)}
          className="w-full h-40 p-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="Enter filter criteria..."
        />
      </div>

      {/* Allow Criteria */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-gray-900 font-semibold">Allow Criteria</Label>
            <p className="text-xs text-gray-500 mt-0.5">Tweets matching these will be shown normally</p>
          </div>
          {!isDefault.good && (
            <button
              onClick={() => resetToDefault('good')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Reset
            </button>
          )}
        </div>
        <textarea
          value={criteria.good}
          onChange={(e) => handleChange('good', e.target.value)}
          className="w-full h-40 p-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="Enter allow criteria..."
        />
      </div>

      {/* Highlight Criteria */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-gray-900 font-semibold">Highlight Criteria</Label>
            <p className="text-xs text-gray-500 mt-0.5">Tweets matching these will be highlighted with a green border</p>
          </div>
          {!isDefault.highlight && (
            <button
              onClick={() => resetToDefault('highlight')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Reset
            </button>
          )}
        </div>
        <textarea
          value={criteria.highlight}
          onChange={(e) => handleChange('highlight', e.target.value)}
          className="w-full h-40 p-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Enter highlight criteria..."
        />
      </div>

      <div className="text-sm text-gray-500">
        Priority: Filter → Highlight → Allow. Tweets are classified in this order.
      </div>
    </div>
  );
}
