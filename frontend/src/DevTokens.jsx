import React from 'react';

export default function DevTokens() {
  return (
    <div className="app-main p-8 md:p-16 flex flex-col items-center">
      <div className="max-w-3xl w-full flex flex-col gap-12">
        <div>
          <h1 className="text-display-lg mb-2">Design Tokens</h1>
          <p className="text-body-lg text-secondary">Verify that these components match the ForgeTrack Design System.</p>
        </div>

        {/* Card */}
        <section>
          <h2 className="text-label text-tertiary mb-4">CARD & TYPOGRAPHY</h2>
          <div className="card">
            <h3 className="text-h3 mb-2">Market Overview</h3>
            <p className="text-body text-secondary mb-6">
              Cards have a glass surface, a subtle gradient overlay, and an inset border. 
              The page has a cosmic radial glow at the top.
            </p>
            <div className="flex gap-4 items-end">
              <div>
                <span className="text-caption text-tertiary block mb-1">Attendance</span>
                <span className="text-display-md tabular-nums">84.2%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-label text-tertiary mb-4">BUTTONS</h2>
          <div className="flex gap-4">
            <button className="btn-primary">Mark Attendance</button>
            <button className="btn-secondary">Cancel</button>
          </div>
        </section>

        {/* Inputs */}
        <section>
          <h2 className="text-label text-tertiary mb-4">INPUTS</h2>
          <div className="flex flex-col gap-2 max-w-sm">
            <label className="text-label text-secondary">STUDENT USN</label>
            <input type="text" className="input" placeholder="e.g. 4SH24CS001" />
          </div>
        </section>

        {/* Pills */}
        <section>
          <h2 className="text-label text-tertiary mb-4">STATUS PILLS</h2>
          <div className="flex gap-4">
            <span className="pill pill-success">Present</span>
            <span className="pill pill-danger">Absent</span>
          </div>
        </section>
      </div>
    </div>
  );
}
