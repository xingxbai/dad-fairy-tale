export interface Story {
  id: string;
  title: string;
  content: string;
  audioUrl?: string;
  coverImage?: string;
}

export interface UserState {
  voiceId: string | null;
  currentStory: Story | null;
}
