# Getting Started

## First-Time Setup

When you first open HamTab, you'll see the splash screen with essential configuration options. Complete these steps to get the most out of HamTab.

## Setting Your Callsign

Your callsign is used for:
- Calculating distances to spots
- Live Spots widget (showing where your signal is received)
- DX Detail widget lookups

To set your callsign:
1. Click the **gear icon** in the top-right corner to open Config
2. Enter your callsign in the **Callsign** field
3. Press Enter or click outside the field to save

<div class="tip">Your callsign is stored locally in your browser and is never transmitted to any server.</div>

## Setting Your Location

Your location (QTH) enables distance calculations, map centering, and satellite pass predictions. You have three options:

### Option 1: GPS (Automatic)

Click **Use GPS** to automatically detect your location. Your browser will ask for permission to access your location.

<div class="warning">GPS requires HTTPS and browser permission. Some browsers block GPS on self-signed certificates.</div>

### Option 2: Grid Square

Enter your 4 or 6-character Maidenhead grid square (e.g., `FN31` or `FN31pr`). HamTab calculates the center of that grid square.

### Option 3: Manual Coordinates

Enter your latitude and longitude directly:
- **Latitude**: Decimal degrees (e.g., `41.7128`)
- **Longitude**: Decimal degrees, negative for West (e.g., `-73.0060`)

## Time Format

Choose your preferred time display format:
- **Local** — Times shown in your browser's timezone
- **UTC** — Times shown in Coordinated Universal Time (recommended for amateur radio)

## API Keys (Optional)

Some features require free API keys:

### N2YO API Key (Satellite Tracking)

1. Visit [n2yo.com/api](https://www.n2yo.com/api/)
2. Create a free account
3. Copy your API key
4. Paste it in Config → N2YO API Key

<div class="tip">Without an N2YO key, satellite tracking will be disabled but all other features work normally.</div>

### Weather Underground API Key (Weather Data)

Required only if you want local weather data from Weather Underground instead of NWS:

1. Visit [wunderground.com/member/api-keys](https://www.wunderground.com/member/api-keys)
2. Create a free account and generate an API key
3. Paste it in Config → Weather Underground API Key

## Saving Your Configuration

All settings are saved automatically to your browser's localStorage. To export or import your configuration:

1. Open Config (gear icon)
2. Click **Export Config** to download a JSON file
3. Use **Import Config** to restore settings on another device

<div class="important">Exported config files contain your API keys. Keep them secure and don't share them publicly.</div>

## Quick Start Checklist

- [ ] Set your callsign
- [ ] Set your location (GPS, grid, or manual)
- [ ] Choose time format (UTC recommended)
- [ ] Add N2YO API key (if you want satellite tracking)
- [ ] Arrange widgets to your preference (drag title bars)
- [ ] Save a filter preset for your usual operating
