/* ---------- Sample Demo Data for Tikorix (Guest / Local Mode) ----------
   Isolated from mock-api.js to keep data separate from request handler logic.
*/
(function () {
  'use strict';

  const SAMPLE_ARTISTS = ['Harsha', 'Marita', 'Savya'];

  const SAMPLE_CATEGORIES = [
    'Open Call', 'Exhibition', 'Exhibition & Prize', 'Exhibition Proposal',
    'Online Exhibition', 'Competition', 'Prize', 'Grant', 'Residency',
    'Solo Show', 'Group Show', 'Gallery', 'Publication', 'Award',
    'Mentorship', 'Platform', 'Institution', 'Art Fair/Festival'
  ];

  const SAMPLE_INBOX = [
    { row: 2, title: 'Venice Biennale 2026 Open Call', artists: 'Harsha, Marita', status: 'Confirmed', category: 'Exhibition', deadline: '2026-11-20', location: 'Venice, Italy', 'application fee': '$50', organiser: 'La Biennale di Venezia', 'organiser email': 'opencalls@labiennale.org', summary: 'Major international contemporary art exhibition accepting artist portfolio proposals for national pavilions and collateral events.', 'team review': 'Approved to send', 'added on': '1 Nov', 'application link': 'https://labiennale.org' },
    { row: 3, title: 'Kochi-Muziris Residency Program', artists: 'Savya', status: 'Confirmed', category: 'Residency', deadline: '2026-12-05', location: 'Kochi, India', 'application fee': 'Free', organiser: 'Kochi Biennale Foundation', 'organiser email': 'info@kochimuzirisbiennale.org', summary: '3-month studio residency with stipend and production support for South Asian artists.', 'team review': 'Approved to send', 'added on': '2 Nov', 'application link': 'https://kochimuzirisbiennale.org' },
    { row: 4, title: 'Tate Modern Emerging Artist Grant', artists: 'Harsha', status: 'Confirmed', category: 'Grant', deadline: '2026-11-15', location: 'London, UK', 'application fee': 'Free', organiser: 'Tate Modern', 'organiser email': 'grants@tate.org.uk', summary: '£10,000 research and production fellowship for visual artists working in mixed media.', 'team review': 'Approved to send', 'added on': '3 Nov', 'application link': 'https://tate.org.uk' }
  ];

  const SAMPLE_QUEUE = [
    { row: 5, title: 'Berlin Summer Studio Fellowship', artists: 'Marita', status: 'Pending', category: 'Residency', deadline: '2027-01-15', location: 'Berlin, Germany', 'application fee': '€30', organiser: 'Künstlerhaus Bethanien', summary: 'Studio residency fellowship for mid-career artists with exhibition support.', 'added on': '3 Nov', 'application link': 'https://bethanien.de' }
  ];

  const SAMPLE_ARCHIVED = [
    { row: 6, title: 'Prix Pictet Photography Award 2025', artists: 'Savya', status: 'Archived', category: 'Prize', deadline: '2025-10-01', location: 'Geneva, Switzerland', 'application fee': 'Free', organiser: 'Prix Pictet', summary: 'Global photography and visual arts award focused on sustainability.', 'added on': '1 Oct', 'application link': 'https://prixpictet.com' }
  ];

  const SAMPLE_PEOPLE = [
    { id: 'demo_user', name: 'Hazel (Guest)' },
    { id: 'demo_curator', name: 'Curator' }
  ];

  const SAMPLE_PIPELINE = {
    stageOrder: ['Added', 'Approved', 'Awaiting response', 'Interested', 'Need more info', 'Applied', 'Accepted', 'Not accepted'],
    stages: {
      'Added': [],
      'Approved': [],
      'Awaiting response': [],
      'Interested': [
        { row: 2, title: 'Venice Biennale 2026 Open Call', artists: 'Harsha', deadline: '2026-11-20', category: 'Exhibition', fee: '$50', teamReview: 'Approved to send', artistResponse: 'Interested', docStatus: 'Sent' },
        { row: 3, title: 'Kochi-Muziris Residency Program', artists: 'Savya', deadline: '2026-12-05', category: 'Residency', fee: 'Free', teamReview: 'Approved to send', artistResponse: 'Interested', docStatus: 'In doc' }
      ],
      'Need more info': [],
      'Applied': [],
      'Accepted': [],
      'Not accepted': []
    }
  };

  window.TkMockData = {
    SAMPLE_ARTISTS,
    SAMPLE_CATEGORIES,
    SAMPLE_INBOX,
    SAMPLE_QUEUE,
    SAMPLE_ARCHIVED,
    SAMPLE_PEOPLE,
    SAMPLE_PIPELINE
  };
})();
