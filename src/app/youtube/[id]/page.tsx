import YouTubeClient from './YouTubeClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <YouTubeClient />;
}
