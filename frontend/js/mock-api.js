/* ---------- Mock API for Demo Mode ----------
   Extracted from app.js on 2026-11-13 as Phase 1 of the frontend modularization.
   Attaches window.mockApi so the api() wrapper in app.js can still reach it.
   Reads window.lists (set in app.js after its primary lists declaration).
*/
(function () {
  function mockApi(action, payload) {
    payload = payload || {};
    switch (action) {
      case 'whoami':
        return { ok: true, status: 'approved', name: 'Hazel (Guest)', email: 'hazel@artisteculture.com' };
      case 'signOut':
        localStorage.removeItem('oc_demo');
        return { ok: true };
      case 'artists':
        return { ok: true, artists: ['Harsha', 'Marita', 'Savya'] };
      case 'categories':
        return { ok: true, categories: ['Open Call', 'Exhibition', 'Exhibition & Prize', 'Exhibition Proposal', 'Online Exhibition', 'Competition', 'Prize', 'Grant', 'Residency', 'Solo Show', 'Group Show', 'Gallery', 'Publication', 'Award', 'Mentorship', 'Platform', 'Institution', 'Art Fair/Festival'] };
      case 'formFields':
        return { ok: true, fields: [] };
      case 'counts':
        return { ok: true, counts: { Pending: 1, Confirmed: 3, Archived: 1 } };
      case 'getInbox':
        return {
          ok: true,
          entries: [
            { row: 2, title: 'Venice Biennale 2026 Open Call', artists: 'Harsha, Marita', status: 'Confirmed', category: 'Exhibition', deadline: '2026-11-20', location: 'Venice, Italy', 'application fee': '$50', organiser: 'La Biennale di Venezia', 'organiser email': 'opencalls@labiennale.org', summary: 'Major international contemporary art exhibition accepting artist portfolio proposals for national pavilions and collateral events.', 'team review': 'Approved to send', 'added on': '1 Nov', 'application link': 'https://labiennale.org' },
            { row: 3, title: 'Kochi-Muziris Residency Program', artists: 'Savya', status: 'Confirmed', category: 'Residency', deadline: '2026-12-05', location: 'Kochi, India', 'application fee': 'Free', organiser: 'Kochi Biennale Foundation', 'organiser email': 'info@kochimuzirisbiennale.org', summary: '3-month studio residency with stipend and production support for South Asian artists.', 'team review': 'Approved to send', 'added on': '2 Nov', 'application link': 'https://kochimuzirisbiennale.org' },
            { row: 4, title: 'Tate Modern Emerging Artist Grant', artists: 'Harsha', status: 'Confirmed', category: 'Grant', deadline: '2026-11-15', location: 'London, UK', 'application fee': 'Free', organiser: 'Tate Modern', 'organiser email': 'grants@tate.org.uk', summary: '£10,000 research and production fellowship for visual artists working in mixed media.', 'team review': 'Approved to send', 'added on': '3 Nov', 'application link': 'https://tate.org.uk' }
          ]
        };
      case 'getQueue':
        return {
          ok: true,
          entries: [
            { row: 5, title: 'Berlin Summer Studio Fellowship', artists: 'Marita', status: 'Pending', category: 'Residency', deadline: '2027-01-15', location: 'Berlin, Germany', 'application fee': '€30', organiser: 'Künstlerhaus Bethanien', summary: 'Studio residency fellowship for mid-career artists with exhibition support.', 'added on': '3 Nov', 'application link': 'https://bethanien.de' }
          ]
        };
      case 'getArchived':
        return {
          ok: true,
          entries: [
            { row: 6, title: 'Prix Pictet Photography Award 2025', artists: 'Savya', status: 'Archived', category: 'Prize', deadline: '2025-10-01', location: 'Geneva, Switzerland', 'application fee': 'Free', organiser: 'Prix Pictet', summary: 'Global photography and visual arts award focused on sustainability.', 'added on': '1 Oct', 'application link': 'https://prixpictet.com' }
          ]
        };
      case 'p2_getPeople':
        return { ok: true, people: [{ id: 'demo_user', name: 'Hazel (Guest)' }, { id: 'demo_curator', name: 'Curator' }] };
      case 'p2_setMyPerson':
        return { ok: true, personId: 'demo_user', name: payload.name || 'Hazel (Guest)' };
      case 'p2_getAlerts':
        return {
          ok: true,
          closing: [{ row: 2, title: 'Venice Biennale 2026 Open Call', days: 2, when: 'in 2 days', deadline: '20 Nov', status: 'Sent to Harsha, Marita' }],
          noReply: [],
          reminders: []
        };
      case 'p2_getNeedsAttention':
        return { ok: true, items: [] };
      case 'p2_pipeline':
        return {
          ok: true,
          stageOrder: ['Added', 'Approved', 'Awaiting response', 'Interested', 'Need more info', 'Applied', 'Accepted', 'Not accepted'],
          stages: {
            'Added': [],
            'Approved': [],
            'Awaiting response': [],
            // Venice and Kochi are both Interested on their pitch pages, so the list shows them under Preparing.
            'Interested': [
              { row: 2, title: 'Venice Biennale 2026 Open Call', artists: 'Harsha', deadline: '2026-11-20', category: 'Exhibition', fee: '$50', teamReview: 'Approved to send', artistResponse: 'Interested', docStatus: 'Sent' },
              { row: 3, title: 'Kochi-Muziris Residency Program', artists: 'Savya', deadline: '2026-12-05', category: 'Residency', fee: 'Free', teamReview: 'Approved to send', artistResponse: 'Interested', docStatus: 'In doc' }],
            'Need more info': [],
            // Tate Modern is submitted on its pitch page (mock call 4), so the list shows it here too.
            'Applied': [{ row: 4, title: 'Tate Modern Emerging Artist Grant', artists: 'Harsha', deadline: '2026-11-15', category: 'Grant', fee: 'Free', teamReview: 'Approved to send', artistResponse: 'Interested', docStatus: 'Sent' }],
            'Accepted': [],
            'Not accepted': []
          }
        };
      case 'p2_dashboard':
        return {
          ok: true,
          stats: { applied: 3, accepted: 1, pending: 1, closingSoon: 1, artists: 3 },
          upcoming: [{ row: 2, title: 'Venice Biennale 2026 Open Call', days: 2, deadline: '2026-11-20', artists: 'Harsha, Marita' }]
        };
      case 'p2_getArtists':
        return {
          ok: true,
          artists: [
            { row: 2, name: 'Harsha', sheetLink: '#', email: 'harsha@artisteculture.com', mediums: 'Painting, Sculpture', location: 'Mumbai', active: 2, pending: 1 },
            { row: 3, name: 'Marita', sheetLink: '#', email: 'marita@artisteculture.com', mediums: 'Photography, Video', location: 'Goa', active: 1, pending: 0 },
            { row: 4, name: 'Savya', sheetLink: '#', email: 'savya@artisteculture.com', mediums: 'Mixed Media, Digital', location: 'Delhi', active: 1, pending: 0 }
          ]
        };
      case 'p2_getArtistProfile':
        return {
          ok: true,
          artist: { name: payload.name || 'Harsha', email: 'harsha@artisteculture.com', location: 'Mumbai', mediums: 'Painting, Sculpture', notes: 'Interested in residencies and European museum shows.' },
          unsent: [],
          active: [{ row: 2, title: 'Venice Biennale 2026 Open Call', deadline: '2026-11-20', category: 'Exhibition', fee: '$50', status: 'In Progress' }],
          past: []
        };
      case 'p2_getEntry':
        return {
          ok: true,
          entry: { row: payload.row || 2, title: 'Venice Biennale 2026 Open Call', artists: 'Harsha, Marita', status: 'Confirmed', category: 'Exhibition', deadline: '2026-11-20', location: 'Venice, Italy', 'application fee': '$50', organiser: 'La Biennale di Venezia', 'organiser email': 'opencalls@labiennale.org', summary: 'Major international contemporary art exhibition.', 'team review': 'Approved to send', link: 'https://labiennale.org' },
          states: [{ name: 'Harsha', sentOn: '2026-11-01', inDocOn: '2026-11-01', response: 'Interested', status: 'In Progress' }]
        };
      case 'p2_getArtistCall': {
        const rowId = Number(payload.row) || 2;
        const artist = payload.artist || 'Harsha';
        const allCalls = [...(lists.inbox || []), ...(lists.drafts || []), ...(lists.archive || [])];
        const match = allCalls.find(item => Number(item.row) === rowId);
        const callTitle = match ? match.title : (rowId === 1 ? 'Autumn Production Grant 2027' : rowId === 2 ? 'Venice Fellowship & Studio' : rowId === 3 ? 'Kochi Biennale Foundation Commission' : rowId === 4 ? 'Kyoto Ceramic & Wood Studio' : rowId === 5 ? 'Basel Art Residency 2026' : 'London Contemporary Print Prize');
        const category = match ? match.category : (rowId === 1 || rowId === 6 ? 'Grant' : rowId === 3 ? 'Commission' : 'Residency');
        const organiser = match ? (match.organiser || 'Arts Council') : (rowId === 1 ? 'Arts Council International' : rowId === 2 ? 'Fondazione Arte Contemporanea' : rowId === 3 ? 'Kochi Biennale Foundation' : 'Kyoto Arts Center');
        const fee = match ? (match['application fee'] || match.fee || 'Free') : (rowId === 1 ? '₹3,50,000' : 'Free');
        const deadline = match ? match.deadline : '2026-11-20';
        const assignedTo = (match && match.assignedUser) ? match.assignedUser.name : 'Unassigned';
  
        let sentOn = '2026-11-01', artistResponse = 'Interested', status = 'In Progress', bucket = 'Active', appliedOn = '';
        if (rowId === 1) {
          sentOn = '2026-10-30'; artistResponse = 'Wants more info'; status = 'Pending Artist'; bucket = 'Active';
        } else if (rowId === 2) {
          sentOn = '2026-11-01'; artistResponse = 'Interested'; status = 'Pending Artist'; bucket = 'Active';
        } else if (rowId === 3) {
          sentOn = '2026-10-25'; artistResponse = 'Interested'; status = 'Drafting Statement'; bucket = 'Active';
        } else if (rowId === 4) {
          sentOn = '2026-10-15'; artistResponse = 'Interested'; status = 'Application Submitted'; appliedOn = '2026-10-28'; bucket = 'Active';
        } else if (rowId === 5) {
          sentOn = '2026-09-20'; artistResponse = 'Interested'; status = 'Accepted'; appliedOn = '2026-10-05'; bucket = 'Past';
        } else if (rowId === 6) {
          sentOn = '2026-09-10'; artistResponse = 'Not Interested'; status = 'Declined'; bucket = 'Past';
        }
  
        return {
          ok: true,
          call: {
            row: rowId,
            title: callTitle,
            artist: artist,
            category: category,
            organiser: organiser,
            fee: fee,
            deadline: deadline,
            assignedTo: assignedTo,
            sentOn: sentOn,
            artistResponse: artistResponse,
            status: status,
            bucket: bucket,
            appliedOn: appliedOn,
            paid: 'Paid',
            dueOn: deadline,
            artworks: 'Horizon Series #1, #2',
            comments: 'Curatorial statement and artist dossier prepared for review.',
            docs: [
              { name: 'Artist CV & Bio', done: true },
              { name: 'Portfolio (10 Selected Works)', done: true },
              { name: 'Project Proposal / Statement', done: rowId >= 3 },
              { name: 'Budget & Production Schedule', done: rowId >= 4 }
            ]
          },
          fields: {
            status: status,
            paid: 'Paid',
            assignedTo: assignedTo,
            dueOn: deadline,
            artworks: 'Horizon Series #1, #2',
            comments: 'Curatorial statement and artist dossier prepared for review.'
          },
          docs: [
            { name: 'Artist CV & Bio', done: true },
            { name: 'Portfolio (10 Selected Works)', done: true },
            { name: 'Project Proposal / Statement', done: rowId >= 3 },
            { name: 'Budget & Production Schedule', done: rowId >= 4 }
          ]
        };
      }
      case 'getReminders':
        return {
          ok: true,
          rules: [
            { id: 'R1', active: 'Yes', scope: 'All calls', days: 7, recipients: '{team}', subject: 'Any news on {call}?', message: 'Checking follow-up...', channel: 'Email', repeat: 0 },
            { id: 'R2', active: 'Yes', scope: 'All calls', days: 14, recipients: '{team}', subject: 'Following up: {call}', message: 'Second follow up...', channel: 'Email', repeat: 0 }
          ]
        };
      case 'getReport':
        return {
          ok: true,
          period: '2026-11 (EOM)',
          table: [
            { artist: 'Harsha', applied: 2, accepted: 1, rejected: 0, awaiting: 1, notForward: 0 },
            { artist: 'Marita', applied: 1, accepted: 0, rejected: 0, awaiting: 1, notForward: 0 },
            { artist: 'Savya', applied: 1, accepted: 0, rejected: 0, awaiting: 1, notForward: 0 }
          ]
        };
      case 'getSourceFiles':
        return { ok: true, files: [], expired: 0, keepDays: 5 };
      default:
        return { ok: true, message: 'Action simulated in Demo Mode.' };
    }
  }
  window.mockApi = mockApi;
}());
