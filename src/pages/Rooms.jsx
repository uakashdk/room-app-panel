import CrudPage from './CrudPage.jsx';

const fields = [
  { key: 'title', label: 'Room title', type: 'text', required: true, wide: true },
  { key: 'subtitle', label: 'Subtitle', type: 'text', wide: true },
  { key: 'hostName', label: 'Host name', type: 'text' },
  { key: 'category', label: 'Category', type: 'select', options: ['popular', 'music', 'talk', 'friends'] },
  { key: 'listeners', label: 'Listeners (number shown)', type: 'number' },
  { key: 'theme', label: 'Card colour', type: 'select', options: ['violet', 'plum', 'indigo', 'wine'] },
  { key: 'isLive', label: 'Live now (shown on Home)', type: 'checkbox' },
];

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'hostName', label: 'Host' },
  { key: 'category', label: 'Category' },
  { key: 'listeners', label: 'Listeners' },
  { key: 'isLive', label: 'Live', render: (r) => (r.isLive ? 'Yes' : 'No') },
  { key: 'theme', label: 'Colour' },
];

const samples = [
  ['Music Lounge', 'music', 20], ['Late Night Talks', 'talk', 32], ['Friends Zone', 'friends', 44],
  ['Singing Room', 'music', 56], ['Chill & Chat', 'talk', 68],
].map(([title, category, listeners], i) => ({
  title, subtitle: 'Join the conversation', hostName: 'Host', category, listeners, theme: i % 2 ? 'plum' : 'violet', isLive: true,
}));

export default function Rooms({ staff }) {
  return (
    <CrudPage
      staff={staff}
      title="Rooms"
      noun="room"
      collectionName="rooms"
      fields={fields}
      columns={columns}
      defaults={{ isLive: true, category: 'popular', theme: 'violet' }}
      sortFn={(a, b) => (b.listeners || 0) - (a.listeners || 0)}
      samples={samples}
      hint="These rooms appear on the Home screen of the app. Real rooms created by users and voice come in the voice-room step."
    />
  );
}
