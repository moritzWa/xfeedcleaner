import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from 'react';

function Popup() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [displayMode, setDisplayMode] = useState<'blur' | 'hide'>('blur');

  useEffect(() => {
    chrome.storage.sync.get(['isEnabled', 'displayMode'], (result) => {
      setIsEnabled(result.isEnabled ?? true);
      if (result.displayMode) {
        setDisplayMode(result.displayMode);
      }
    });
  }, []);

  const toggleExtension = async (checked: boolean) => {
    setIsEnabled(checked);
    await chrome.storage.sync.set({ isEnabled: checked });
    
    // Notify content script of the change
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { 
          action: "toggleExtension", 
          isEnabled: checked 
        });
      }
    });
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleDisplayModeChange = (value: string) => {
    const mode = value as 'blur' | 'hide';
    setDisplayMode(mode);
    chrome.storage.sync.set({ displayMode: mode });
  };

  return (
    <div className="w-[300px] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img 
            src="/logos/logo128.png" 
            alt="XFeedCleaner Logo"
            className="w-6 h-6 rounded-full"
          />
          <h1 className="text-xl font-semibold text-black m-0">
            XFeedCleaner
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {isEnabled ? 'on' : 'off'}
          </span>
          <Switch
            checked={isEnabled}
            onCheckedChange={toggleExtension}
            className="data-[state=checked]:bg-black"
          />
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground mb-5 text-pretty">
        Filter distracting content from your X feed
      </p>

      <div className="mb-5">
        <p className="text-sm font-medium mb-2">Display mode</p>
        <RadioGroup
          value={displayMode}
          onValueChange={handleDisplayModeChange}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="blur" id="blur" />
            <Label htmlFor="blur">Blur</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="hide" id="hide" />
            <Label htmlFor="hide">Hide</Label>
          </div>
        </RadioGroup>
      </div>

      <Button
        onClick={openSettings}
        className="w-full py-3 bg-black hover:bg-gray-800 text-white rounded-full
        text-sm font-semibold transition-colors"
      >
        Prompt Settings
      </Button>
    </div>
  );
}

export default Popup;
  