# Troubleshooting

Common issues and their solutions.

## Location / GPS Issues

### GPS Button Does Nothing
**Possible causes:**
- Browser doesn't support Geolocation API
- Page not served over HTTPS
- Browser permission denied

**Solutions:**
1. Ensure you're using HTTPS (check URL bar for lock icon)
2. Check browser permissions: Settings → Privacy → Location
3. Try a different browser (Chrome recommended)
4. Use Grid Square or Manual coordinates instead

### GPS Permission Denied
**Solution:**
1. Click the lock/info icon in the address bar
2. Find Location permission
3. Change from "Block" to "Allow"
4. Reload the page

### Location Not Accurate
**Solutions:**
- Use 6-character grid square for better precision
- Enter manual coordinates from a GPS app or Google Maps
- GPS accuracy varies by device and environment

---

## Data Loading Issues

### Spots Not Loading
**Possible causes:**
- Network connectivity issue
- Server temporarily unavailable
- Browser cache issue

**Solutions:**
1. Check your internet connection
2. Wait a minute and spots will auto-refresh
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. Clear browser cache and reload

### "No spots found" Message
**This is normal when:**
- No activations match your current filters
- Time of day has low activity
- Band conditions are poor

**Try:**
- Clear all filters to see if spots exist
- Check different source tabs (POTA, SOTA, DXC, PSK)
- Widen your distance filter
- Increase age filter

### Stale Data
If data seems outdated:
1. Check the timestamp in the widget (if shown)
2. Hard refresh the page
3. Check if the data source itself is down (visit pota.app, sotawatch, etc.)

---

## Satellite Tracking Issues

### "API Key Required" Message
**Solution:**
1. Get a free API key from [n2yo.com/api](https://www.n2yo.com/api/)
2. Open Config (gear icon)
3. Paste the key in the N2YO API Key field
4. Wait a few seconds for data to load

### Satellites Not Showing
**Possible causes:**
- Invalid API key
- N2YO service temporarily down
- No satellites tracked

**Solutions:**
1. Verify your API key is correct (no extra spaces)
2. Open satellite settings (gear icon) and ensure satellites are selected
3. Check [n2yo.com](https://www.n2yo.com/) to verify service is working

### Pass Times Seem Wrong
**Check:**
- Your location is set correctly
- Your timezone setting matches your expectation
- Pass times are shown in your selected format (Local or UTC)

---

## Weather Data Issues

### Weather Not Displaying
**For US locations:**
- NWS data should load automatically
- Check that your location is within the United States

**For non-US locations:**
- Weather Underground API key required
- Enter your WU API key in Config

### Weather Underground Not Working
**Solutions:**
1. Verify your API key is valid
2. Check that your WU account is active
3. WU free tier has daily request limits — may be exhausted

---

## Map Issues

### Map Not Loading
**Possible causes:**
- JavaScript error
- Network blocking tile servers
- Browser extension interference

**Solutions:**
1. Open browser console (F12) and check for errors
2. Disable ad blockers temporarily
3. Try incognito/private mode
4. Try a different browser

### Markers Not Appearing
**Check:**
- Widget visibility (HamMap must be checked in Config)
- Filters aren't excluding all spots
- Zoom level (zoom in if markers seem missing)

### Map Tiles Missing
**Solutions:**
- Check internet connection
- OpenStreetMap tile servers may be temporarily slow
- Wait and tiles will load as bandwidth allows

---

## Filter Issues

### Filters Not Working
**Symptoms:** Changing filters has no effect

**Solutions:**
1. Clear all filters and start fresh
2. Check if you're on the correct source tab
3. Some filters only apply to certain sources (e.g., State filter is POTA-only)

### Privilege Filter Hiding Everything
**Cause:** Selected license class has no privileges on active bands

**Solution:**
- Select a higher license class
- Or disable the privilege filter entirely

### Presets Not Saving
**Possible causes:**
- localStorage is full or disabled
- Private/incognito browsing mode

**Solutions:**
1. Close other tabs to free localStorage space
2. Exit private browsing mode
3. Clear old HamTab data and try again

---

## Display Issues

### Widgets Overlapping
**Solutions:**
1. Drag widgets to rearrange
2. Resize widgets by dragging edges
3. Reset layout by clearing localStorage (see Configuration chapter)

### Text Too Small/Large
**Solutions:**
- Use browser zoom: Ctrl/Cmd + Plus/Minus
- Check your browser's minimum font size setting
- HamTab is designed for 100% browser zoom

### Dark Theme Issues
**Note:** HamTab uses a dark theme by default. If colors appear wrong:
1. Disable browser extensions that modify page colors
2. Check for high contrast mode in OS accessibility settings

---

## Performance Issues

### Page Loading Slowly
**Solutions:**
1. Reduce number of tracked satellites
2. Disable unused overlays (grid, timezone, gray line)
3. Close other browser tabs
4. Use fewer filter presets

### High CPU/Memory Usage
**Possible causes:**
- Many satellites tracked
- Many overlays enabled
- Browser memory leak (rare)

**Solutions:**
1. Reduce tracked satellites to 1-2
2. Disable map overlays
3. Restart browser if issue persists

---

## HF Propagation / VOACAP Issues

### Propagation Widget Shows "Simplified Model"
**Cause:** The VOACAP prediction engine (dvoacap-python) is not installed.

**Solution (Linux/Raspberry Pi):**
```bash
pip3 install numpy
pip3 install git+https://github.com/skyelaird/dvoacap-python.git
```

Then restart HamTab. Check the logs for "[VOACAP] dvoacap-python engine ready".

**Solution (Windows):**
```cmd
pip install numpy
pip install git+https://github.com/skyelaird/dvoacap-python.git
```

<div class="tip">The simplified model still provides useful propagation estimates. The full VOACAP engine is optional but gives more accurate predictions.</div>

### VOACAP Engine Fails to Start
**Possible causes:**
- Python 3 not installed or not in PATH
- numpy not installed
- dvoacap-python installation failed

**Diagnostic steps:**
1. Check Python: `python3 --version` (Linux) or `python --version` (Windows)
2. Check numpy: `python3 -c "import numpy; print('ok')"`
3. Check dvoacap: `python3 -c "import dvoacap; print('ok')"`
4. Check HamTab logs for `[VOACAP]` messages

**Solutions:**
- Install Python 3 from [python.org](https://www.python.org/downloads/) (Windows) or your package manager (Linux)
- Reinstall dependencies: `pip3 install --force-reinstall numpy git+https://github.com/skyelaird/dvoacap-python.git`

### Propagation Predictions Seem Slow
**This is normal.** VOACAP calculations run on the server and can take 5-15 seconds for a full 24-hour matrix, especially on Raspberry Pi.

---

## LAN Mode Specific Issues

### Certificate Warning
**This is expected.** LAN mode uses self-signed certificates.

**Solutions:**
- Click "Advanced" and "Proceed anyway"
- Add certificate exception in browser
- This warning appears once per browser/device

### Can't Access from Other Devices
**Check:**
1. Both devices on same network
2. Firewall allows port 3000 (HTTP) and 3443 (HTTPS)
3. Use the correct IP address (check with `ipconfig` or `ifconfig`)

### Update Checker Not Working
**Solutions:**
1. Ensure internet connection
2. GitHub API may be rate-limited — try again later
3. Check that you're running from a proper release, not development

---

## Getting Help

### Check GitHub Issues
Visit [github.com/your-repo/issues](https://github.com/your-repo/issues) to:
- Search for known issues
- Report new bugs
- Request features

### Provide Debug Information
When reporting issues, include:
- Browser name and version
- Operating system
- Steps to reproduce
- Console errors (F12 → Console tab)
- Screenshots if applicable

### Feedback
Use the in-app feedback form to report issues or suggestions. Your email is encrypted for privacy. You can also join the [HamTab Discord server](https://discord.gg/GcX9cHtT) for real-time community discussion and support.

---

## Quick Fixes Summary

| Problem | Quick Fix |
|---------|-----------|
| Data not loading | Hard refresh (Ctrl+Shift+R) |
| GPS not working | Use Grid Square instead |
| Satellites disabled | Add N2YO API key |
| No spots visible | Clear all filters |
| Layout messed up | Clear localStorage |
| Page slow | Reduce satellites, disable overlays |
| Certificate warning | Accept/proceed (LAN mode only) |
| VOACAP not working | `pip3 install numpy git+https://github.com/skyelaird/dvoacap-python.git` |
