export const FIXTURES = {
  vCard: {
    johnDoe: `BEGIN:VCARD\nVERSION:3.0\nN:Doe;John;;;\nFN:John Doe\nORG:Acme Corp\nTITLE:Engineer\nTEL:555-0199\nEMAIL:john@example.com\nURL:https://example.com/\nADR:;;123 Main St;Metropolis;;;USA\nEND:VCARD`,
    baseData: {
      firstName: 'John',
      lastName: 'Doe',
      organization: 'Acme Corp',
      title: 'Engineer',
      phone: '1234567890',
      email: 'john@example.com',
      website: 'https://example.com',
      street: '123 Main St',
      city: 'Metropolis',
      zip: '12345',
      country: 'USA'
    },
    baseString: `BEGIN:VCARD\nVERSION:3.0\nN:Doe;John;;;\nFN:John Doe\nORG:Acme Corp\nTITLE:Engineer\nTEL:1234567890\nEMAIL:john@example.com\nURL:https://example.com\nADR:;;123 Main St;Metropolis;;12345;USA\nEND:VCARD`
  },
  coordinates: {
    newYork: { latitude: '40.7128', longitude: '-74.0060' },
    boundary: {
      minLat: { latitude: '-90', longitude: '0' },
      maxLat: { latitude: '90', longitude: '0' },
      minLng: { latitude: '0', longitude: '-180' },
      maxLng: { latitude: '0', longitude: '180' }
    }
  }
};
