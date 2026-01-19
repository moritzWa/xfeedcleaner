import { ApiKeys } from './api-keys';
import { PromptsSettings } from './prompts';
import { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const models = [
  // Production Models
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'Meta', vision: false },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', provider: 'Meta', vision: false },

  // Vision Models (can analyze images)
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B (vision)', provider: 'Meta', vision: true },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B (vision)', provider: 'Meta', vision: true },

  // Other Preview Models
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B', provider: 'DeepSeek', vision: false },
  { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', provider: 'Alibaba', vision: false },
];

export default function Settings() {
  const [displayMode, setDisplayMode] = useState<'blur' | 'hide'>('blur');
  const [selectedModel, setSelectedModel] = useState(models[0].id);

  useEffect(() => {
    // Load saved settings
    chrome.storage.sync.get(['displayMode', 'selectedModel'], (result) => {
      if (result.displayMode) {
        setDisplayMode(result.displayMode);
      }
      if (result.selectedModel) {
        setSelectedModel(result.selectedModel);
      }
    });
  }, []);

  const handleDisplayModeChange = (value: string) => {
    const mode = value as 'blur' | 'hide';
    setDisplayMode(mode);
    chrome.storage.sync.set({ displayMode: mode });
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    chrome.storage.sync.set({ selectedModel: modelId });
  };

  const selectedModelName = models.find(m => m.id === selectedModel)?.name || 'Select Model';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 lowercase">
      <h1 className="text-2xl font-bold mb-6 font-mono"> X Feed Cleaner - Settings</h1>
      
      <section className="space-y-6">
        <ApiKeys />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold font-mono lowercase">Model Selection</h2>
        <div className="flex flex-col space-y-2 font-mono lowercase">
          <Label>Choose Model</Label>
          <DropdownMenu>
            <DropdownMenuTrigger className="w-[320px] flex items-center justify-between px-3 py-2 border rounded-md bg-white font-mono">
              {selectedModelName}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[320px] space-y-4 max-h-[400px] overflow-y-auto">
              <DropdownMenuLabel>Models</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {models.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onSelect={() => handleModelChange(model.id)}
                  className="grid grid-cols-12 justify-between font-mono cursor-pointer"
                >
                  <span className="text-left col-span-8">{model.name}</span>
                  <span className="text-sm text-gray-500 col-span-4 text-right">{model.provider}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold font-mono">Display Settings</h2>
        <RadioGroup
          defaultValue={displayMode}
          onValueChange={handleDisplayModeChange}
          className="grid gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="blur" id="blur" />
            <Label htmlFor="blur">Blur tweets</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hide" id="hide" />
            <Label htmlFor="hide">Hide tweets</Label>
          </div>
        </RadioGroup>
      </section>

      <section className="space-y-6">
        <PromptsSettings />
      </section>
    </div>
  );
}
