import WatchClient from './WatchClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <WatchClient />;
}
