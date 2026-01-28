import { PromptsSettings } from './prompts';

export default function Settings() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chirply - Prompt Settings</h1>
        <h1 className="text-2xl font-medium text-muted-foreground">
          <a 
          href="https://moritzw.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          By Moritzw.com
        </a>
        </h1>
      </div>
      <PromptsSettings />
    </div>
  );
}
