// --- Country Bounding Boxes ---
// Static dataset of ~250 country bounding boxes for zoom-to-country.
// Format: [name, south, west, north, east]
// Large countries split into sub-regions so smallest-area heuristic picks the right one.
// Sources: Natural Earth, OpenStreetMap, manual adjustments for antimeridian cases.

export const COUNTRY_BOUNDS = [
  // North America
  ['United States', 24.52, -124.73, 49.38, -66.95],           // contiguous 48
  ['United States (Alaska)', 51.21, -179.15, 71.39, -129.98],
  ['United States (Hawaii)', 18.91, -160.24, 22.24, -154.81],
  ['Canada', 41.68, -141.00, 83.11, -52.62],
  ['Mexico', 14.53, -118.40, 32.72, -86.70],
  ['Guatemala', 13.74, -92.23, 17.82, -88.22],
  ['Belize', 15.89, -89.22, 18.50, -87.49],
  ['Honduras', 12.98, -89.35, 16.51, -83.15],
  ['El Salvador', 13.15, -90.13, 14.45, -87.69],
  ['Nicaragua', 10.71, -87.69, 15.03, -83.15],
  ['Costa Rica', 8.03, -85.95, 11.22, -82.55],
  ['Panama', 7.20, -83.05, 9.65, -77.17],

  // Caribbean
  ['Cuba', 19.83, -84.95, 23.27, -74.13],
  ['Jamaica', 17.70, -78.37, 18.52, -76.18],
  ['Haiti', 18.02, -74.48, 20.09, -71.62],
  ['Dominican Republic', 17.54, -72.00, 19.93, -68.32],
  ['Puerto Rico', 17.93, -67.24, 18.52, -65.59],
  ['Trinidad and Tobago', 10.04, -61.93, 11.36, -60.52],
  ['Bahamas', 20.91, -80.47, 27.26, -72.71],
  ['Barbados', 13.04, -59.65, 13.34, -59.43],
  ['Saint Lucia', 13.71, -61.08, 14.11, -60.87],
  ['Grenada', 11.99, -61.80, 12.53, -61.38],
  ['Antigua and Barbuda', 16.99, -62.35, 17.73, -61.67],
  ['Dominica', 15.20, -61.48, 15.65, -61.24],
  ['Saint Vincent', 12.58, -61.46, 13.38, -61.11],
  ['Saint Kitts and Nevis', 17.09, -62.87, 17.42, -62.54],
  ['Curaçao', 12.04, -69.16, 12.39, -68.73],
  ['Aruba', 12.41, -70.06, 12.63, -69.87],

  // South America
  ['Brazil', -33.75, -73.99, 5.27, -34.79],
  ['Argentina', -55.06, -73.56, -21.78, -53.64],
  ['Chile', -55.98, -75.64, -17.51, -66.96],
  ['Colombia', -4.23, -79.00, 12.46, -66.87],
  ['Peru', -18.35, -81.33, -0.04, -68.65],
  ['Venezuela', 0.63, -73.35, 12.20, -59.80],
  ['Ecuador', -5.01, -81.08, 1.68, -75.19],
  ['Bolivia', -22.90, -69.64, -9.68, -57.45],
  ['Paraguay', -27.59, -62.65, -19.29, -54.26],
  ['Uruguay', -34.95, -58.43, -30.09, -53.07],
  ['Guyana', 1.17, -61.40, 8.56, -56.48],
  ['Suriname', 1.83, -58.07, 6.00, -53.98],
  ['French Guiana', 2.11, -54.54, 5.78, -51.61],
  ['Falkland Islands', -52.41, -61.32, -51.25, -57.71],

  // Europe
  ['Iceland', 63.30, -24.53, 66.56, -13.50],
  ['Norway', 57.96, 4.65, 71.19, 31.08],
  ['Sweden', 55.34, 11.11, 69.06, 24.17],
  ['Finland', 59.81, 20.55, 70.09, 31.59],
  ['Denmark', 54.56, 8.07, 57.75, 15.20],
  ['United Kingdom', 49.96, -8.17, 60.86, 1.75],
  ['Ireland', 51.42, -10.48, 55.38, -5.99],
  ['France', 42.33, -5.14, 51.09, 8.23],                     // metropolitan only
  ['Spain', 35.95, -9.30, 43.79, 4.33],
  ['Portugal', 36.96, -9.50, 42.15, -6.19],
  ['Germany', 47.27, 5.87, 55.06, 15.04],
  ['Netherlands', 50.75, 3.36, 53.47, 7.21],
  ['Belgium', 49.50, 2.54, 51.50, 6.41],
  ['Luxembourg', 49.45, 5.73, 50.18, 6.53],
  ['Switzerland', 45.82, 5.96, 47.81, 10.49],
  ['Austria', 46.37, 9.53, 49.02, 17.16],
  ['Italy', 36.65, 6.63, 47.09, 18.52],
  ['Vatican City', 41.90, 12.45, 41.91, 12.46],
  ['San Marino', 43.89, 12.40, 43.99, 12.52],
  ['Malta', 35.81, 14.18, 36.08, 14.57],
  ['Greece', 34.80, 19.37, 41.75, 29.65],
  ['Turkey', 35.82, 25.66, 42.11, 44.82],
  ['Cyprus', 34.57, 32.27, 35.71, 34.60],
  ['Poland', 49.00, 14.12, 54.84, 24.15],
  ['Czech Republic', 48.55, 12.09, 51.06, 18.86],
  ['Slovakia', 47.73, 16.83, 49.61, 22.57],
  ['Hungary', 45.74, 16.11, 48.59, 22.90],
  ['Romania', 43.62, 20.26, 48.27, 29.69],
  ['Bulgaria', 41.24, 22.36, 44.22, 28.61],
  ['Serbia', 42.23, 18.83, 46.19, 23.00],
  ['Croatia', 42.39, 13.49, 46.55, 19.43],
  ['Bosnia and Herzegovina', 42.56, 15.72, 45.28, 19.62],
  ['Montenegro', 41.85, 18.46, 43.56, 20.36],
  ['North Macedonia', 40.85, 20.45, 42.37, 23.04],
  ['Albania', 39.64, 19.26, 42.66, 21.06],
  ['Kosovo', 41.86, 20.01, 43.27, 21.79],
  ['Slovenia', 45.42, 13.38, 46.88, 16.61],
  ['Estonia', 57.52, 21.76, 59.68, 28.21],
  ['Latvia', 55.67, 20.97, 58.08, 28.24],
  ['Lithuania', 53.90, 20.93, 56.45, 26.84],
  ['Belarus', 51.26, 23.18, 56.17, 32.78],
  ['Ukraine', 44.39, 22.14, 52.38, 40.23],
  ['Moldova', 46.35, 26.62, 48.49, 30.16],
  ['Andorra', 42.43, 1.41, 42.66, 1.79],
  ['Monaco', 43.72, 7.41, 43.75, 7.44],
  ['Liechtenstein', 47.05, 9.47, 47.27, 9.64],

  // Russia — split into European and Asian
  ['Russia (European)', 41.19, 27.33, 69.95, 60.00],
  ['Russia (Asian)', 42.30, 60.00, 81.86, 179.99],

  // Middle East
  ['Israel', 29.49, 34.27, 33.33, 35.88],
  ['Palestine', 31.22, 34.22, 32.55, 35.57],
  ['Lebanon', 33.05, 35.10, 34.69, 36.62],
  ['Syria', 32.31, 35.73, 37.32, 42.35],
  ['Jordan', 29.18, 34.96, 33.38, 39.30],
  ['Iraq', 29.06, 38.79, 37.38, 48.57],
  ['Iran', 25.06, 44.05, 39.78, 63.32],
  ['Saudi Arabia', 16.38, 34.63, 32.15, 55.67],
  ['Yemen', 12.11, 42.53, 19.00, 54.53],
  ['Oman', 16.65, 51.88, 26.39, 59.84],
  ['United Arab Emirates', 22.63, 51.58, 26.08, 56.38],
  ['Qatar', 24.47, 50.75, 26.15, 51.64],
  ['Bahrain', 25.79, 50.45, 26.29, 50.65],
  ['Kuwait', 28.53, 46.55, 30.10, 48.42],

  // Central Asia
  ['Kazakhstan', 40.57, 46.49, 55.44, 87.36],
  ['Uzbekistan', 37.18, 55.99, 45.59, 73.13],
  ['Turkmenistan', 35.14, 52.50, 42.80, 66.68],
  ['Kyrgyzstan', 39.17, 69.25, 43.27, 80.28],
  ['Tajikistan', 36.67, 67.34, 41.04, 75.14],
  ['Afghanistan', 29.38, 60.50, 38.49, 74.89],

  // South Asia
  ['India', 6.75, 68.16, 35.50, 97.40],
  ['Pakistan', 23.69, 60.87, 37.09, 77.83],
  ['Bangladesh', 20.74, 88.01, 26.63, 92.67],
  ['Sri Lanka', 5.92, 79.65, 9.84, 81.88],
  ['Nepal', 26.35, 80.06, 30.45, 88.20],
  ['Bhutan', 26.71, 88.75, 28.33, 92.13],
  ['Maldives', -0.69, 72.64, 7.10, 73.75],

  // East Asia
  ['China', 18.16, 73.50, 53.56, 134.77],
  ['Japan', 24.25, 122.93, 45.52, 153.99],
  ['South Korea', 33.11, 124.60, 38.61, 131.87],
  ['North Korea', 37.67, 124.32, 43.01, 130.67],
  ['Mongolia', 41.58, 87.75, 52.15, 119.93],
  ['Taiwan', 21.90, 120.22, 25.30, 122.00],

  // Southeast Asia
  ['Thailand', 5.61, 97.35, 20.46, 105.64],
  ['Vietnam', 8.56, 102.14, 23.39, 109.46],
  ['Myanmar', 9.78, 92.17, 28.54, 101.17],
  ['Cambodia', 10.41, 102.34, 14.69, 107.63],
  ['Laos', 13.91, 100.09, 22.50, 107.64],
  ['Malaysia', 0.85, 99.64, 7.36, 119.27],
  ['Singapore', 1.26, 103.64, 1.47, 104.01],
  ['Indonesia', -11.00, 95.01, 5.91, 141.02],
  ['Philippines', 4.59, 116.93, 21.12, 126.60],
  ['Brunei', 4.01, 114.08, 5.05, 115.36],
  ['Timor-Leste', -9.50, 124.05, -8.13, 127.31],

  // Africa
  ['Egypt', 22.00, 24.70, 31.67, 36.90],
  ['Libya', 19.51, 9.39, 33.17, 25.15],
  ['Tunisia', 30.23, 7.52, 37.54, 11.60],
  ['Algeria', 18.96, -8.67, 37.09, 11.98],
  ['Morocco', 27.67, -13.17, 35.93, -1.01],
  ['Western Sahara', 20.77, -17.10, 27.67, -8.67],
  ['Mauritania', 14.72, -17.07, 27.30, -4.83],
  ['Mali', 10.16, -12.24, 25.00, 4.27],
  ['Niger', 11.69, 0.17, 23.53, 16.00],
  ['Chad', 7.44, 13.47, 23.45, 24.00],
  ['Sudan', 8.68, 21.84, 22.23, 38.58],
  ['South Sudan', 3.49, 23.44, 12.24, 35.95],
  ['Ethiopia', 3.40, 32.99, 14.89, 48.00],
  ['Eritrea', 12.36, 36.44, 18.00, 43.13],
  ['Djibouti', 10.93, 41.77, 12.71, 43.42],
  ['Somalia', -1.67, 40.99, 11.99, 51.41],
  ['Kenya', -4.68, 33.91, 5.03, 41.90],
  ['Uganda', -1.48, 29.57, 4.23, 35.03],
  ['Tanzania', -11.75, 29.33, -0.99, 40.44],
  ['Rwanda', -2.84, 28.86, -1.05, 30.90],
  ['Burundi', -4.47, 29.00, -2.31, 30.85],
  ['Democratic Republic of the Congo', -13.46, 12.18, 5.39, 31.31],
  ['Republic of the Congo', -5.03, 11.21, 3.70, 18.65],
  ['Gabon', -3.98, 8.70, 2.32, 14.50],
  ['Equatorial Guinea', 0.92, 9.35, 2.35, 11.34],
  ['Cameroon', 1.65, 8.49, 13.08, 16.19],
  ['Central African Republic', 2.22, 14.42, 11.00, 27.46],
  ['Nigeria', 4.28, 2.69, 13.87, 14.68],
  ['Benin', 6.23, 0.77, 12.42, 3.84],
  ['Togo', 6.10, -0.15, 11.14, 1.81],
  ['Ghana', 4.74, -3.26, 11.17, 1.19],
  ['Ivory Coast', 4.36, -8.60, 10.74, -2.49],
  ['Burkina Faso', 9.39, -5.52, 15.08, 2.40],
  ['Liberia', 4.35, -11.49, 8.55, -7.37],
  ['Sierra Leone', 6.93, -13.30, 10.00, -10.28],
  ['Guinea', 7.19, -15.08, 12.68, -7.64],
  ['Guinea-Bissau', 10.93, -16.71, 12.68, -13.64],
  ['Senegal', 12.31, -17.54, 16.69, -11.36],
  ['Gambia', 13.06, -16.81, 13.83, -13.80],
  ['Cape Verde', 14.81, -25.36, 17.20, -22.66],
  ['Mauritius', -20.52, 57.31, -19.97, 57.81],
  ['Madagascar', -25.60, 43.22, -11.95, 50.48],
  ['Mozambique', -26.87, 30.22, -10.47, 40.84],
  ['Malawi', -17.13, 32.67, -9.37, 35.92],
  ['Zambia', -18.08, 21.99, -8.22, 33.49],
  ['Zimbabwe', -22.42, 25.24, -15.61, 33.07],
  ['Botswana', -26.91, 19.99, -17.78, 29.37],
  ['Namibia', -28.97, 11.72, -16.96, 25.26],
  ['South Africa', -34.84, 16.45, -22.13, 32.89],
  ['Eswatini', -27.32, 30.79, -25.72, 32.13],
  ['Lesotho', -30.67, 27.01, -28.57, 29.46],
  ['Angola', -18.04, 11.64, -4.37, 24.08],
  ['Comoros', -12.42, 43.23, -11.36, 44.54],
  ['Seychelles', -9.76, 46.20, -4.28, 56.30],
  ['São Tomé and Príncipe', 0.02, 6.47, 1.70, 7.47],
  ['Réunion', -21.39, 55.22, -20.87, 55.84],

  // Oceania
  ['Australia', -43.64, 113.16, -10.06, 153.64],
  ['New Zealand', -47.29, 166.43, -34.39, 178.57],
  ['Papua New Guinea', -10.69, 140.84, -1.35, 155.97],
  ['Fiji', -20.68, 177.00, -12.48, -179.87],              // antimeridian
  ['New Caledonia', -22.70, 163.56, -19.55, 168.13],
  ['Solomon Islands', -11.85, 155.51, -6.59, 167.21],
  ['Vanuatu', -20.25, 166.52, -13.07, 170.24],
  ['Samoa', -14.06, -172.80, -13.43, -171.42],
  ['Tonga', -21.46, -175.68, -15.56, -173.91],
  ['Palau', 2.80, 131.12, 8.10, 134.73],
  ['Micronesia', 1.03, 137.33, 10.09, 163.04],
  ['Marshall Islands', 4.57, 160.80, 14.62, 172.03],
  ['Kiribati', -11.44, 169.56, 4.72, -150.22],            // antimeridian
  ['Tuvalu', -10.80, 176.06, -5.64, 179.87],
  ['Nauru', -0.56, 166.90, -0.49, 166.96],
  ['Guam', 13.24, 144.62, 13.65, 144.96],
  ['American Samoa', -14.38, -170.83, -14.16, -169.42],

  // North Asia / other
  ['Georgia', 41.05, 40.01, 43.59, 46.72],
  ['Armenia', 38.84, 43.45, 41.30, 46.63],
  ['Azerbaijan', 38.39, 44.79, 41.91, 50.37],
];

/**
 * Find the smallest bounding box containing the given lat/lon.
 * Handles antimeridian cases where west > east.
 * Returns [south, west, north, east] or null if no match.
 */
export function findCountryBounds(lat, lon) {
  let best = null;
  let bestArea = Infinity;

  for (const [, south, west, north, east] of COUNTRY_BOUNDS) {
    // Latitude check
    if (lat < south || lat > north) continue;

    // Longitude check — handle antimeridian wrap
    let lonInside;
    if (west <= east) {
      lonInside = lon >= west && lon <= east;
    } else {
      // Antimeridian: box spans the date line (e.g. Fiji: 177 to -179.87)
      lonInside = lon >= west || lon <= east;
    }
    if (!lonInside) continue;

    // Compute area — smaller area wins (e.g. Vatican inside Italy)
    const latSpan = north - south;
    const lonSpan = west <= east ? (east - west) : (360 - west + east);
    const area = latSpan * lonSpan;

    if (area < bestArea) {
      bestArea = area;
      best = [south, west, north, east];
    }
  }

  return best;
}
