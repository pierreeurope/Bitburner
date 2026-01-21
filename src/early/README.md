# Early-run starter pack (post-augmentation)

These scripts are designed for low RAM and no Singularity. Run them in order.

1. `run early/1_bootstrap-hwg.js`  
   Starts a single-target HWG loop on `n00dles` tuned for XP.

2. `run early/2_hacknet-roi.js`  
   Starts ROI-based Hacknet upgrades with a safe spend cap.

3. `run early/3_rotate-hwg.js`  
   Rotates HWG across all rooted servers using one script (XP focus).

4. `run early/4_fleet-auto.js`  
   Auto-roots (uses your port crackers), buys servers if needed, and assigns one
   server per target. Depth defaults to 5, and it will not use home RAM.
   Runs in XP mode by default.

Notes:
- If RAM is tight, stop at step 3.
- Step 4 needs port crackers for better coverage.
