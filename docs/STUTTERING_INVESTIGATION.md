# 15-Second Stuttering Investigation Report

## Summary
A persistent visual stuttering issue occurs every ~15 seconds in ALL production deployments, but never locally. After extensive investigation, the root cause remains unknown.

## The Problem
- **Frequency:** Every 15-17 seconds
- **Duration:** Brief visual stutter/freeze
- **Affected:** Desktop browsers only (mobile unaffected)
- **Environments:** ALL production deployments (Cloud Run, Render.com, etc.)
- **NOT affected:** Local development servers

## What We've Ruled Out (All Hypotheses DISPROVED)

### ❌ Performance Issues
- **Spatial Grid Optimization:** Successfully improved server performance by 8000x but didn't fix stuttering
- **FPS Monitoring:** Shows steady 60 FPS even during stutters - it's a pure visual issue

### ❌ Infrastructure & Resources
- **Cloud Run:** Not specific to Google Cloud - happens on Render.com too
- **CPU/Memory:** Doubled CPU, quadrupled RAM - no improvement
- **Cold Starts:** Always-on instances don't help
- **CPU Throttling:** Disabling throttling has no effect

### ❌ Client-Side Rendering
- **CSS Animations:** Completely removed - stuttering persists
- **Canvas Optimizations:** Desynchronized rendering didn't help
- **WebGL vs Canvas2D:** Full PIXI.js WebGL implementation - identical stuttering
- **Grid Rendering:** Completely disabled - no change

### ❌ Network & WebSockets
- **Transport Type:** Forcing WebSocket-only didn't help
- **Ping Intervals:** Adjusting timings had no effect
- **Network Update Rate:** Increasing from 60Hz to 120Hz didn't fix it

## Key Observations

1. **Desktop-Only:** Mobile browsers on same servers don't stutter
2. **Production-Only:** Never happens locally, even with production builds
3. **Universal:** Affects ALL production hosting providers equally
4. **Visual-Only:** Not detected as frame drops by performance monitoring

## Remaining Theories

Since it only happens in production on desktop browsers, potential causes:
- HTTPS/WSS vs HTTP/WS differences
- Production minification/optimization artifacts
- Browser security policies in production
- CDN or proxy layer interference
- Production-specific environment variables
- Desktop browser compositor bugs with certain production configurations

## Performance Improvements That DO Work

While investigating stuttering, we successfully improved other aspects:
- **Spatial Grid:** 8000x faster visibility calculations (3800ms → 0.47ms)
- **Network Updates:** 120Hz update rate reduces network jitter
- **Viewport Culling:** 50-80% fewer draw calls

## Conclusion

The 15-second stuttering remains unsolved after exhaustive investigation. It appears to be a very specific interaction between:
- Production environments (any hosting provider)
- Desktop browsers (all browsers affected)
- Some unknown factor that differs from local development

## Recommendations

1. **Accept Current State:** The game is playable despite the stuttering
2. **Monitor User Reports:** See if specific browser versions are worse
3. **Consider Workarounds:**
   - Recommend mobile play for sensitive users
   - Add a "stuttering info" notice for desktop users
4. **Future Investigation:**
   - Profile production JavaScript execution
   - Analyze browser timeline during stutters
   - Check for 15-second timers in dependencies

## Investigation Date
November 8-9, 2024