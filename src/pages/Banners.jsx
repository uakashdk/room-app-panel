import CrudPage from './CrudPage.jsx';

const fields = [
  { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
  { key: 'eyebrow', label: 'Small text above title', type: 'text', wide: true },
  { key: 'subtitle', label: 'Subtitle', type: 'text', wide: true },
  { key: 'buttonText', label: 'Button text (leave empty for no button)', type: 'text' },
  { key: 'theme', label: 'Colour', type: 'select', options: ['purple', 'gold', 'blue', 'pink'] },
  { key: 'order', label: 'Order (1 shows first)', type: 'number' },
  { key: 'active', label: 'Active (shown in the app)', type: 'checkbox' },
];

const columns = [
  { key: 'order', label: 'Order' },
  { key: 'title', label: 'Title' },
  { key: 'theme', label: 'Colour' },
  { key: 'active', label: 'Active', render: (r) => (r.active ? 'Yes' : 'No') },
];

const samples = [
  { eyebrow: 'LIVE VOICE COMMUNITY', title: 'Your voice, your world.', subtitle: 'Sing · Chat · Play · Connect', buttonText: 'Explore Rooms', theme: 'purple', order: 1, active: true },
  { eyebrow: 'NEW', title: 'Send gifts, win rewards', subtitle: 'Support your favourite hosts', buttonText: '', theme: 'gold', order: 2, active: true },
];

export default function Banners({ staff }) {
  return (
    <CrudPage
      staff={staff}
      title="Banners"
      noun="banner"
      collectionName="banners"
      fields={fields}
      columns={columns}
      defaults={{ active: true, theme: 'purple', order: 1 }}
      sortFn={(a, b) => (a.order || 0) - (b.order || 0)}
      samples={samples}
      hint="Banners slide at the top of the Home screen. If you add none, the app shows a default banner."
    />
  );
}
