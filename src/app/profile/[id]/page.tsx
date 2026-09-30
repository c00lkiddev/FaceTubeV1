import ProfileClient from './ProfileClient';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <ProfileClient />;
}
