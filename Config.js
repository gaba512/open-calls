// Production settings. Local test values live in the test harness only.
// ENV must be 'production' for the live deployment; the server refuses to answer
// requests if it is anything else.
const CONFIG = {
  ENV: 'production',
  INBOX_TAB: 'Inbox', ARTISTS_TAB: 'Artists', TEAM_TAB: 'Team', ERRORS_TAB: 'Errors',
  OPPORTUNITIES_TAB: 'Opportunities', ARTIST_PROFILES_TAB: 'Artist Profiles', ARTISTCALLS_INDEX_TAB: 'ArtistCalls Index', ARTISTCALLS_TAB: 'ArtistCalls',
  TIMEZONE: 'Asia/Kolkata', APP_URL: 'https://gaba512.github.io/open-calls/',
  MODEL: 'gemini-3.8-flash',
  GOOGLE_CLIENT_ID: '403289948637-ls0es7gmhmna4rdag7ke3b1mlpm9qiv6.apps.googleusercontent.com',
  ALLOWED_DOMAIN: 'artisteculture.com', AUTO_APPROVE_DOMAIN: false,
  APPROVERS: ['info@artisteculture.com', 'curator@artisteculture.com'], TOKEN_EXPIRY_DAYS: 60,
  CALENDAR_ID: 'c_241fbd5acf88489fc3de66a206553cea9f095e3ee5934d5dc513a0964d895cff@group.calendar.google.com',
  CALENDAR_NAME: 'Open Calls', REMINDER_DAYS: [7, 2],
  UPLOADS_FOLDER_NAME: 'Open Calls uploads', SOURCE_KEEP_DAYS: 5,
  MAX_READS_PER_HOUR: 40, MAX_READS_PER_HOUR_ALL: 120, MAX_UPLOAD_CHARS: 16000000, MAX_TEXT_CHARS: 5000
};

const STARTING_ARTISTS = [['Harsha', 'https://docs.google.com/spreadsheets/d/1VDwV62VTJjs-k-3-Wo9QtkpDC5zaJ_NrWxeQdaV5Sqc/edit?gid=0#gid=0'], ['Marita', 'https://docs.google.com/spreadsheets/d/1bSnFOUu9TuCDTWpjy7fLS8QQy3CWwMvghVv784VdEMQ/edit?gid=1578013555#gid=1578013555'], ['Savya', 'https://docs.google.com/spreadsheets/d/1Z7p_tNpNveeS3SM9Puy4wgmOx5sH0xVjGxvPoWqnQsk/edit?gid=322693510#gid=322693510']];
const INBOX_HEADERS = ['Added On', 'Title', 'Artists', 'Sent To', 'Status', 'Confirmed On', 'Verified By', 'Review Stats', 'Category', 'Selection Month', 'Deadline', 'Application Fee', 'Application Link', 'Event Dates', 'Announcement Date', 'Organiser', 'Organiser Email', 'Fees', 'Required Docs', 'Location', 'Eligibility', 'Medium', 'Summary', 'Submitted By', 'Calendar Event ID', 'Source Files', 'Team Review', 'Additional Info'];
const COPY_TO_ARTIST = ['Title', 'Review Stats', 'Category', 'Selection Month', 'Deadline', 'Application Fee', 'Application Link', 'Event Dates', 'Announcement Date'];
const STATUSES = ['Pending', 'Confirmed', 'Archived'];

const P2 = {
  PEOPLE_TAB: 'People', APPROVALS_TAB: 'Approvals', DOCS_FOLDER_NAME: 'Open Calls artist docs',
  STAGES: ['Added', 'Approved', 'Awaiting response', 'Interested', 'Need more info', 'Applied', 'Accepted', 'Not accepted'],
  ARTIST_EXTRA_HEADERS: ['Handoff On', 'In Doc On', 'Sent On', 'Interested', 'Team Review', 'Artist Review', 'Artist Response', 'Category', 'Status', 'Paid', 'Applied On', 'Submitted Docs', 'Comments on Applications', 'Response Updated On', 'Response Updated By', 'Response Comment', 'Assigned To', 'Due On', 'Artworks', 'Payments', 'Docs Checklist', 'Application Folder'],
  TEAM_REVIEWS: ['Shortlisted', 'Approved to send', 'Not sent'], ARTIST_REVIEWS: ['Artist Reviewed', 'To be Reviewed'],
  APP_STATUSES: ['Applied', 'In Progress', 'Accepted', 'Declined', 'Awaiting Response', 'Not Moving Forward', 'On Hold', 'Not Selected'], PAID_OPTIONS: ['Paid', 'Pending', 'After Selection'],
  CATEGORIES: ['Open Call', 'Exhibition', 'Exhibition & Prize', 'Exhibition Proposal', 'Online Exhibition', 'Competition', 'Competition & Prize', 'Prize', 'Grant', 'Residency', 'Solo Show', 'Group Show', 'Gallery', 'Publication', 'Award', 'Mentorship', 'Platform', 'Institution', 'Art Fair/Festival'],
  ARTIST_PROFILE_HEADERS: ['Artist Name', 'Sheet Link', 'Email', 'Phone', 'Mediums', 'Location', 'Eligibility Notes', 'Notes']
};