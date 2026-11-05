/**
 * Seed catalog for the RailGPT demo environment.
 *
 * IMPORTANT: This is illustrative demo data, NOT a live Indian Railways feed.
 * Train numbers/names are modeled on well-known services so the product feels
 * familiar, but schedules, fares and capacities are representative sample values.
 * The UI labels this clearly as a demo environment.
 */

export const STATIONS = [
  { code: 'NDLS', name: 'New Delhi', city: 'Delhi', state: 'Delhi' },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'MAS', name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu' },
  { code: 'HWH', name: 'Howrah Jn', city: 'Kolkata', state: 'West Bengal' },
  { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
  { code: 'ASR', name: 'Amritsar Jn', city: 'Amritsar', state: 'Punjab' },
  { code: 'LDH', name: 'Ludhiana Jn', city: 'Ludhiana', state: 'Punjab' },
  { code: 'JRC', name: 'Jalandhar Cantt', city: 'Jalandhar', state: 'Punjab' },
  { code: 'CDG', name: 'Chandigarh', city: 'Chandigarh', state: 'Chandigarh' },
  { code: 'UMB', name: 'Ambala Cantt', city: 'Ambala', state: 'Haryana' },
  { code: 'FZR', name: 'Firozpur Cantt', city: 'Firozpur', state: 'Punjab' },
  { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', state: 'J&K' },
  { code: 'SVDK', name: 'SMVD Katra', city: 'Katra', state: 'J&K' },
  { code: 'JP', name: 'Jaipur Jn', city: 'Jaipur', state: 'Rajasthan' },
  { code: 'ADI', name: 'Ahmedabad Jn', city: 'Ahmedabad', state: 'Gujarat' },
  { code: 'PUNE', name: 'Pune Jn', city: 'Pune', state: 'Maharashtra' },
  { code: 'SC', name: 'Secunderabad Jn', city: 'Hyderabad', state: 'Telangana' },
  { code: 'BPL', name: 'Bhopal Jn', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'LKO', name: 'Lucknow NR', city: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh' },
  { code: 'PNBE', name: 'Patna Jn', city: 'Patna', state: 'Bihar' },
  { code: 'GHY', name: 'Guwahati', city: 'Guwahati', state: 'Assam' },
  { code: 'DBRG', name: 'Dibrugarh', city: 'Dibrugarh', state: 'Assam' },
  { code: 'BSB', name: 'Varanasi Jn', city: 'Varanasi', state: 'Uttar Pradesh' },
  { code: 'PRYJ', name: 'Prayagraj Jn', city: 'Prayagraj', state: 'Uttar Pradesh' },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', state: 'Uttar Pradesh' },
  { code: 'GWL', name: 'Gwalior Jn', city: 'Gwalior', state: 'Madhya Pradesh' },
  { code: 'NGP', name: 'Nagpur Jn', city: 'Nagpur', state: 'Maharashtra' },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha' },
  { code: 'PURI', name: 'Puri', city: 'Puri', state: 'Odisha' },
  { code: 'MAO', name: 'Madgaon Jn', city: 'Margao', state: 'Goa' },
  { code: 'TVC', name: 'Thiruvananthapuram', city: 'Thiruvananthapuram', state: 'Kerala' },
  { code: 'ERS', name: 'Ernakulam Jn', city: 'Kochi', state: 'Kerala' },
  { code: 'CBE', name: 'Coimbatore Jn', city: 'Coimbatore', state: 'Tamil Nadu' },
  { code: 'MDU', name: 'Madurai Jn', city: 'Madurai', state: 'Tamil Nadu' },
  { code: 'DDN', name: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand' },
  { code: 'RNC', name: 'Ranchi Jn', city: 'Ranchi', state: 'Jharkhand' },
  { code: 'VSKP', name: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { code: 'BZA', name: 'Vijayawada Jn', city: 'Vijayawada', state: 'Andhra Pradesh' },
  { code: 'TPJ', name: 'Tiruchirappalli', city: 'Tiruchirappalli', state: 'Tamil Nadu' },
];

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const cls = (classType, totalSeats, fare, racLimit, waitingLimit) => ({ classType, totalSeats, fare, racLimit, waitingLimit });

/** Helper to build a train record. */
function T(trainNumber, trainName, source, destination, departureTime, arrivalTime, durationMinutes, distanceKm, trainType, daysOfRun, classes) {
  return { trainNumber, trainName, source, destination, departureTime, arrivalTime, durationMinutes, distanceKm, trainType, daysOfRun, classes };
}

export const TRAINS = [
  // Punjab / North corridor (relevant to the user's region)
  T('12903', 'Golden Temple Mail', 'Mumbai Central', 'Amritsar Jn', '18:45', '05:30', 2085, 1930, 'Mail/Express', ALL_DAYS,
    [cls('SL', 72, 715, 18, 40), cls('3A', 64, 1885, 16, 36), cls('2A', 48, 2710, 12, 28), cls('1A', 24, 4590, 8, 18)]),
  T('12904', 'Golden Temple Mail', 'Amritsar Jn', 'Mumbai Central', '05:00', '05:25', 1465, 1930, 'Mail/Express', ALL_DAYS,
    [cls('SL', 72, 715, 18, 40), cls('3A', 64, 1885, 16, 36), cls('2A', 48, 2710, 12, 28), cls('1A', 24, 4590, 8, 18)]),
  T('12497', 'Shan-e-Punjab', 'New Delhi', 'Amritsar Jn', '06:40', '13:10', 390, 448, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 305, 20, 44), cls('3A', 64, 810, 16, 36), cls('2A', 48, 1160, 12, 28), cls('CC', 78, 620, 18, 40)]),
  T('12498', 'Shan-e-Punjab', 'Amritsar Jn', 'New Delhi', '15:20', '22:05', 405, 448, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 305, 20, 44), cls('3A', 64, 810, 16, 36), cls('2A', 48, 1160, 12, 28), cls('CC', 78, 620, 18, 40)]),
  T('12013', 'Amritsar Shatabdi', 'New Delhi', 'Amritsar Jn', '07:20', '13:00', 340, 448, 'Shatabdi', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    [cls('CC', 78, 905, 18, 40), cls('EC', 56, 1780, 10, 22)]),
  T('12014', 'Amritsar Shatabdi', 'Amritsar Jn', 'New Delhi', '16:30', '22:10', 340, 448, 'Shatabdi', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    [cls('CC', 78, 905, 18, 40), cls('EC', 56, 1780, 10, 22)]),
  T('12411', 'Chandigarh Intercity', 'Amritsar Jn', 'Chandigarh', '06:00', '10:05', 245, 253, 'Intercity', ALL_DAYS,
    [cls('CC', 78, 465, 18, 40), cls('2S', 108, 165, 24, 50)]),
  T('12412', 'Chandigarh Intercity', 'Chandigarh', 'Amritsar Jn', '17:00', '21:05', 245, 253, 'Intercity', ALL_DAYS,
    [cls('CC', 78, 465, 18, 40), cls('2S', 108, 165, 24, 50)]),
  T('14673', 'Shaheed Express', 'Ludhiana Jn', 'New Delhi', '05:10', '11:45', 395, 340, 'Mail/Express', ALL_DAYS,
    [cls('SL', 80, 265, 20, 44), cls('3A', 64, 705, 16, 36), cls('2A', 48, 1010, 12, 28), cls('2S', 108, 140, 24, 50)]),
  T('14674', 'Shaheed Express', 'New Delhi', 'Ludhiana Jn', '18:30', '01:05', 395, 340, 'Mail/Express', ALL_DAYS,
    [cls('SL', 80, 265, 20, 44), cls('3A', 64, 705, 16, 36), cls('2A', 48, 1010, 12, 28), cls('2S', 108, 140, 24, 50)]),

  // Western / Rajdhani corridor
  T('12951', 'Mumbai Rajdhani', 'Mumbai Central', 'New Delhi', '17:00', '08:35', 935, 1384, 'Rajdhani', ALL_DAYS,
    [cls('3A', 64, 2615, 16, 36), cls('2A', 48, 3740, 12, 28), cls('1A', 24, 6320, 8, 18)]),
  T('12952', 'Mumbai Rajdhani', 'New Delhi', 'Mumbai Central', '16:55', '08:15', 920, 1384, 'Rajdhani', ALL_DAYS,
    [cls('3A', 64, 2615, 16, 36), cls('2A', 48, 3740, 12, 28), cls('1A', 24, 6320, 8, 18)]),
  T('12953', 'August Kranti Rajdhani', 'Mumbai Central', 'Hazrat Nizamuddin', '17:40', '10:55', 1035, 1377, 'Rajdhani', ALL_DAYS,
    [cls('3A', 64, 2495, 16, 36), cls('2A', 48, 3560, 12, 28), cls('1A', 24, 6010, 8, 18)]),
  T('12909', 'Garib Rath', 'Mumbai Central', 'Hazrat Nizamuddin', '15:35', '09:25', 1070, 1377, 'Garib Rath', ['Mon', 'Wed', 'Sat'],
    [cls('3A', 78, 1215, 20, 44), cls('CC', 78, 830, 18, 40)]),

  // Southern corridor
  T('12621', 'Tamil Nadu Express', 'Chennai Central', 'New Delhi', '22:00', '07:10', 1990, 2180, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 785, 22, 48), cls('3A', 64, 2065, 16, 36), cls('2A', 48, 2960, 12, 28), cls('1A', 24, 5010, 8, 18)]),
  T('12622', 'Tamil Nadu Express', 'New Delhi', 'Chennai Central', '22:30', '07:40', 1990, 2180, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 785, 22, 48), cls('3A', 64, 2065, 16, 36), cls('2A', 48, 2960, 12, 28), cls('1A', 24, 5010, 8, 18)]),
  T('12627', 'Karnataka Express', 'KSR Bengaluru', 'New Delhi', '19:20', '06:40', 2120, 2365, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 825, 22, 48), cls('3A', 64, 2175, 16, 36), cls('2A', 48, 3115, 12, 28), cls('1A', 24, 5275, 8, 18)]),
  T('12628', 'Karnataka Express', 'New Delhi', 'KSR Bengaluru', '20:45', '08:10', 2125, 2365, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 825, 22, 48), cls('3A', 64, 2175, 16, 36), cls('2A', 48, 3115, 12, 28), cls('1A', 24, 5275, 8, 18)]),
  T('12841', 'Coromandel Express', 'Howrah Jn', 'Chennai Central', '14:50', '16:50', 1560, 1662, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 665, 22, 48), cls('3A', 64, 1755, 16, 36), cls('2A', 48, 2515, 12, 28), cls('1A', 24, 4265, 8, 18)]),
  T('12842', 'Coromandel Express', 'Chennai Central', 'Howrah Jn', '08:45', '11:05', 1580, 1662, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 665, 22, 48), cls('3A', 64, 1755, 16, 36), cls('2A', 48, 2515, 12, 28), cls('1A', 24, 4265, 8, 18)]),

  // Eastern / Northeast corridor
  T('12301', 'Howrah Rajdhani', 'Howrah Jn', 'New Delhi', '16:50', '10:05', 1035, 1447, 'Rajdhani', ALL_DAYS,
    [cls('3A', 64, 2705, 16, 36), cls('2A', 48, 3870, 12, 28), cls('1A', 24, 6545, 8, 18)]),
  T('12302', 'Howrah Rajdhani', 'New Delhi', 'Howrah Jn', '16:50', '10:00', 1030, 1447, 'Rajdhani', ALL_DAYS,
    [cls('3A', 64, 2705, 16, 36), cls('2A', 48, 3870, 12, 28), cls('1A', 24, 6545, 8, 18)]),
  T('12423', 'Dibrugarh Rajdhani', 'New Delhi', 'Dibrugarh', '20:50', '05:40', 2690, 2452, 'Rajdhani', ALL_DAYS,
    [cls('3A', 64, 3235, 16, 36), cls('2A', 48, 4625, 12, 28), cls('1A', 24, 7830, 8, 18)]),
  T('12424', 'Dibrugarh Rajdhani', 'Dibrugarh', 'New Delhi', '20:35', '06:00', 2605, 2452, 'Rajdhani', ALL_DAYS,
    [cls('3A', 64, 3235, 16, 36), cls('2A', 48, 4625, 12, 28), cls('1A', 24, 7830, 8, 18)]),

  // Central / Western
  T('12002', 'Bhopal Shatabdi', 'New Delhi', 'Bhopal Jn', '06:00', '14:40', 520, 707, 'Shatabdi', ALL_DAYS,
    [cls('CC', 78, 1255, 18, 40), cls('EC', 56, 2460, 10, 22)]),
  T('12001', 'Bhopal Shatabdi', 'Bhopal Jn', 'New Delhi', '14:40', '23:20', 520, 707, 'Shatabdi', ALL_DAYS,
    [cls('CC', 78, 1255, 18, 40), cls('EC', 56, 2460, 10, 22)]),
  T('12137', 'Punjab Mail', 'Mumbai Central', 'Firozpur Cantt', '19:35', '05:50', 1815, 1707, 'Mail/Express', ALL_DAYS,
    [cls('SL', 96, 625, 22, 48), cls('3A', 64, 1650, 16, 36), cls('2A', 48, 2365, 12, 28), cls('1A', 24, 4005, 8, 18)]),
  T('12138', 'Punjab Mail', 'Firozpur Cantt', 'Mumbai Central', '21:45', '08:05', 1820, 1707, 'Mail/Express', ALL_DAYS,
    [cls('SL', 96, 625, 22, 48), cls('3A', 64, 1650, 16, 36), cls('2A', 48, 2365, 12, 28), cls('1A', 24, 4005, 8, 18)]),
  T('12615', 'Grand Trunk Express', 'Chennai Central', 'New Delhi', '19:15', '06:30', 2235, 2180, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 780, 22, 48), cls('3A', 64, 2055, 16, 36), cls('2A', 48, 2945, 12, 28), cls('1A', 24, 4985, 8, 18)]),
  T('12723', 'Telangana Express', 'Hyderabad Deccan', 'New Delhi', '06:25', '05:55', 1410, 1661, 'Superfast', ALL_DAYS,
    [cls('SL', 96, 645, 22, 48), cls('3A', 64, 1705, 16, 36), cls('2A', 48, 2445, 12, 28), cls('1A', 24, 4140, 8, 18)]),
];

export const DEMO_USERS = [
  { name: 'Aarav Mehta', email: 'aarav@railgpt.app', password: 'Travel@123', role: 'USER', phone: '+91 98150 12345' },
  { name: 'RailGPT Admin', email: 'admin@railgpt.app', password: 'Admin@123', role: 'ADMIN', phone: '+91 98000 00000' },
];
