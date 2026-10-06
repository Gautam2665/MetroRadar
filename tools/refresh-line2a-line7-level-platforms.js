/**
 * Deliberately disabled pending verified as-built station engineering data.
 *
 * The former implementation deleted every Line 2A/7 platform and level, then
 * recreated generic two-level stations and UNKNOWN platforms. That promoted
 * 2015 DPR design assumptions into current station rows and mishandled the
 * terminal and Andheri West exceptions. Category B DPR evidence is retained in
 * the evidence layer; it is not an as-built database refresh manifest.
 *
 * Re-enable only after a station-by-station, operator-sourced manifest exists
 * with verified level ordering, terminal exceptions, platform directions,
 * screen barrier type and provenance. No database connection is opened here.
 */

throw new Error(
  'Line 2A/7 level-platform refresh blocked: verified as-built station manifest is not available. No database changes were made.',
);
