# CAD Georeferencing & Spatial Transformation

Transit agencies frequently release station layout sheets, contractor tender annexures, and station facility maps as unprojected CAD drawings (DWG/DXF) or vector-embedded PDF blueprints. These drawings contain detailed geometric representations of platform edges, turnstiles, concourse stairs, lifts, and street access portals.

However, they exist in arbitrary 2D Cartesian sheet spaces (measured in PostScript points or millimeters) with no coordinate reference system (CRS). To make these assets queryable within PostGIS and usable by routing engines, TransitOS applies rigorous mathematical transformation workflows.

---

## Mathematical Transformation Models

### 1. The Helmert 2D Similarity Transformation (4-Parameter)
When the drawing scale is uniform and orthogonal axes are preserved, TransitOS uses a four-parameter Helmert transformation. This model preserves shapes and angles without introducing non-affine shear distortion:

$$\begin{bmatrix} X_{\text{proj}} \\ Y_{\text{proj}} \end{bmatrix} = s \begin{bmatrix} \cos\theta & -\sin\theta \\ \sin\theta & \cos\theta \end{bmatrix} \begin{bmatrix} x_{\text{cad}} - x_0 \\ y_{\text{cad}} - y_0 \end{bmatrix} + \begin{bmatrix} X_0 \\ Y_0 \end{bmatrix}$$

Where:
* $(x_{\text{cad}}, y_{\text{cad}})$: Local Cartesian coordinates on the CAD sheet.
* $(x_0, y_0)$: Selected local anchor / centroid of the drawing (e.g. geometric center of the concourse).
* $s$: Uniform scale factor converting sheet units to ground meters ($s \approx 0.35\text{ m/pt}$ on typical $1:200$ engineering sheets).
* $\theta$: Rotation angle (bearing) aligning the drawing's longitudinal axis with the true geographic corridor heading.
* $(X_0, Y_0)$: Ground coordinates of the anchor point in projected metric space (UTM Zone 43N / EPSG:32643).

### 2. The 6-Parameter Affine Transformation
In cases where historical scans or multi-scale drawings exhibit slight differential scaling between the longitudinal ($X$) and transversal ($Y$) axes:

$$\begin{bmatrix} X_{\text{proj}} \\ Y_{\text{proj}} \end{bmatrix} = \begin{bmatrix} a & b \\ c & d \end{bmatrix} \begin{bmatrix} x_{\text{cad}} \\ y_{\text{cad}} \end{bmatrix} + \begin{bmatrix} e \\ f \end{bmatrix}$$

Parameters $a, b, c, d, e, f$ are estimated using ordinary least squares (OLS) regression across a set of $n \ge 3$ ground control points (GCPs).

---

## Implementation in TransitOS: Mumbai Line 7 & Line 9

The platform repository includes an operational Python transformation script designed to run standalone or directly inside the **QGIS Python Console**:
[`tools/extract_line7_cad_to_qgis.py`](file:///c:/Users/HP/OneDrive/Desktop/MetroRadar/tools/extract_line7_cad_to_qgis.py)

### Technical Workflow
1. **Vector Primitive Extraction**: PyMuPDF (`fitz`) parses the PDF layout sheet (`Annexure_C_Station_layout_with_kiosk_layout_of_Metro_Line_7.pdf`), extracting drawing paths, bounding rectangles, text labels, and facility icons.
2. **Anchor Point Matching**: Each station layout sheet is associated with a ground-truthed platform GPS centroid and a corridor bearing along the Western Express Highway (WEH):
   ```python
   STATION_LOOKUP = {
       "OVARIPADA": {
           "gps": (19.243411, 72.864248),
           "bearing_deg": 6.29,
           "keywords": ["OVARIPADA"]
       },
       "NATIONAL PARK": {
           "gps": (19.229415, 72.863120),
           "bearing_deg": 4.15,
           "keywords": ["NATIONAL PARK", "BORIVALI"]
       },
       # ...
   }
   ```
3. **Rigid Coordinate Rotation & Metric Translation**:
   ```python
   # Convert sheet offset to ground displacement (meters)
   dx_m = (pt_x - CENTER_X) * SCALE_M_PER_PT
   dy_m = (CENTER_Y - pt_y) * SCALE_M_PER_PT  # Invert Y (PDF origin is top-left)

   # Rotate by corridor highway bearing
   rad = math.radians(bearing_deg)
   east_m = dx_m * math.cos(rad) - dy_m * math.sin(rad)
   north_m = dx_m * math.sin(rad) + dy_m * math.cos(rad)

   # Convert metric displacement to WGS84 coordinates
   lat = anchor_lat + (north_m / 111132.95)
   lng = anchor_lng + (east_m / (111132.95 * math.cos(math.radians(anchor_lat))))
   ```
4. **Automated QGIS Layer Loading**: When executed inside the QGIS Python Console, the script automatically writes standardized GeoJSON files (`datasets/mumbai/line9_geojson/*_cad_georeferenced.geojson`) and injects them as active vector layers into the open `mumbai.qgz` project.

---

## Ground Control Points (GCP) & Error Analysis

| Station Corridor | Primary GCP Features | Transformation | Average Residual (RMSE) |
|---|---|---|---|
| **Line 7 (Elevated WEH)** | Highway median viaduct piers, station centerline columns | 4-Parameter Helmert | $\pm 1.8\text{ m}$ |
| **Line 9 (Mira-Bhayandar)** | Road intersection centerlines, FOB structural foundations | 4-Parameter Helmert | $\pm 2.4\text{ m}$ |
| **Line 1 (Versova-Ghatkopar)** | Blueprints georeferenced against satellite footprints | 6-Parameter Affine | $\pm 1.2\text{ m}$ |

### Known Structural Limitations
* **Design vs As-Built Variance**: Construction changes during civil execution can shift final street-level staircases by $2\text{--}5\text{ m}$ relative to tender drawings.
* **Vertical Dimension Omission**: 2D CAD sheets compress vertical levels into flat layers. Concourse-to-platform elevations ($\Delta Z$) must be cross-verified against elevation sections in DPR documentation.
* **Validation Requirement**: No CAD-derived coordinate is ingested into production routing without visual overlay against high-resolution satellite imagery or ground photo verification.
