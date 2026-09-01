export const FIXTURES = {
  vCard: {
    johnDoe: `BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;John;;;\r\nFN:John Doe\r\nORG:Acme Corp\r\nTITLE:Engineer\r\nTEL:555-0199\r\nEMAIL:john@example.com\r\nURL:https://example.com/\r\nADR:;;123 Main St;Metropolis;;;USA\r\nEND:VCARD`,
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
    baseString: `BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;John;;;\r\nFN:John Doe\r\nORG:Acme Corp\r\nTITLE:Engineer\r\nTEL:1234567890\r\nEMAIL:john@example.com\r\nURL:https://example.com\r\nADR:;;123 Main St;Metropolis;;12345;USA\r\nEND:VCARD`
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
