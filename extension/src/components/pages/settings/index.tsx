import { PromptsSettings } from './prompts';

export default function Settings() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">XFeedCleaner - Prompt Settings</h1>
      <PromptsSettings />
    </div>
  );
}
