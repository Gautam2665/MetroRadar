# TransitOS Certification Audit — HMRL (Hyderabad)
### System Metadata & Data Quality Audit Report
**Sprint Version**: Sprint 5.5 | **Schema Version**: CTM v1.0 | **Certified**: 2026-08-01

---

## 🎖️ Certification Status: 🥇 Gold Badge (100/100)

| Attribute | Value |
|:---|:---|
| **System Code** | `HMRL` |
| **City / Region** | Hyderabad |
| **Operator Network** | Hyderabad Metro Rail Limited |
| **Source Type** | `OFFICIAL` |
| **Trust Tier** | `TIER_A` |
| **Portal Source** | [https://hmrl.co.in/open-data.html](https://hmrl.co.in/open-data.html) |
| **License** | Open Data Telangana |
| **Lifecycle Status** | `CERTIFIED` |
| **Dataset Version** | `v1.0.0` |
| **Feed Version** | `2026.06` |
| **SHA-256 Checksum** | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

---

## 📊 Pure Static GTFS Quality Score Breakdown

$$\text{Overall Quality Score} = 100 / 100$$

| Quality Dimension | Max Score | Score Achieved | Status |
|:---|:---:|:---:|:---:|
| **Schema Compliance** | 25 | 25 | ✅ Pass |
| **Geometry Completeness** | 25 | 25 | ✅ Pass |
| **Schedule Depth** | 25 | 25 | ✅ Pass |
| **Metadata & Hex Colors** | 15 | 15 | ✅ Pass |
| **Reference Integrity** | 10 | 10 | ✅ Pass |

---

## 🌐 System Coverage Metrics

| Coverage Metric | Percentage |
|:---|:---:|
| **Station Coordinates Coverage** | 100% |
| **Line Association Coverage** | 100% |
| **Trip Schedule Coverage** | 98% |
| **Polyline Shape Coverage** | 95% |
| **Calendar Service Coverage** | 100% |

---

## ⚙️ System Capability Flags

```json
{
  "static": true,
  "realtimeOfficial": false,
  "realtimeEstimated": true,
  "fare": true,
  "accessibility": true,
  "indoor": false,
  "commercial": false,
  "tdse": false
}
```

---

## 🔄 TDSE Target Strategy
- **Primary Source**: `OFFICIAL`
- **Backup Source**: `TDSE`
- **Audit Notes**: Covers Red, Blue, and Green corridors. Official GTFS dataset.
