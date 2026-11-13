/* ---------- Mock API for Demo Mode ----------
   Extracted from app.js as Phase 1 of frontend modularization.
   Delegates sample datasets to window.TkMockData (mock-data.js).
*/
(function () {
  function mockApi(action, payload) {
    payload = payload || {};
    const d = window.TkMockData || {};

    switch (action) {
      case 'whoami':
        return { ok: true, status: 'approved', name: 'Hazel (Guest)', email: 'hazel@artisteculture.com' };
      case 'signOut':
        localStorage.removeItem('oc_demo');
        return { ok: true };
      case 'artists':
        return { ok: true, artists: d.SAMPLE_ARTISTS || ['Harsha', 'Marita', 'Savya'] };
      case 'categories':
        return { ok: true, categories: d.SAMPLE_CATEGORIES || [] };
      case 'formFields':
        return { ok: true, fields: [] };
      case 'counts':
        return { ok: true, counts: { Pending: 1, Confirmed: 3, Archived: 1 } };
      case 'getInbox':
        return { ok: true, entries: d.SAMPLE_INBOX || [] };
      case 'getQueue':
        return { ok: true, entries: d.SAMPLE_QUEUE || [] };
      case 'getArchived':
        return { ok: true, entries: d.SAMPLE_ARCHIVED || [] };
      case 'p2_getPeople':
        return { ok: true, people: d.SAMPLE_PEOPLE || [] };
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
        return Object.assign({ ok: true }, d.SAMPLE_PIPELINE || {});
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
        const allCalls = [...(window.lists && window.lists.inbox ? window.lists.inbox : []), ...(window.lists && window.lists.drafts ? window.lists.drafts : []), ...(window.lists && window.lists.archive ? window.lists.archive : [])];
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
            summary: match ? match.summary : 'Curated institutional grant providing financial award and catalog showcase.',
            link: match ? match['application link'] : 'https://example.org',
            assignedTo: assignedTo,
            step: 'Application',
            bucket: bucket,
            sentOn: sentOn,
            artistResponse: artistResponse,
            status: status,
            appliedOn: appliedOn,
            docStatus: 'In doc',
            docLink: 'https://docs.google.com/document/d/sample-doc'
          }
        };
      }
      case 'p2_saveResponseComment':
        return { ok: true, message: 'Saved comment for ' + (payload.artist || 'artist') };
      case 'p2_recordArtistResponse':
        return { ok: true, message: 'Recorded response: ' + (payload.response || 'Updated') };
      case 'p2_generateEmailText':
        return {
          ok: true,
          subject: 'Curated Opportunity: Autumn Production Grant (₹3,50,000)',
          body: 'Hi ' + (payload.artist || 'Artist') + ',\n\nHope your studio work is going well!\n\nThe curatorial team vetted this new open call that strongly aligns with your practice:\n\n• Opportunity: Autumn Production Grant 2027\n• Funding & Support: ₹3,50,000 direct production stipend\n• Deadline: 6 November 2026\n\nBest,\nHazel & the Curatorial Team'
        };
      case 'p2_markSent':
        return { ok: true, message: 'Marked as Sent to ' + (payload.artist || 'artist') };
      case 'p2_updateApplicationDetails':
        return { ok: true, message: 'Application details updated.' };
      case 'p2_markApplied':
        return { ok: true, message: 'Opportunity marked as Applied.' };
      case 'p2_recordOutcome':
        return { ok: true, message: 'Outcome recorded.' };
      default:
        return { ok: true, message: 'Action succeeded (Demo mode simulation).' };
    }
  }

  window.mockApi = mockApi;
})();
