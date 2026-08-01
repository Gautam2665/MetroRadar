# TransitOS Certification Audit — CMRL (Chennai)
### System Metadata & Data Quality Audit Report
**Sprint Version**: Sprint 5.5 | **Schema Version**: CTM v1.0 | **Certified**: 2026-08-01

---

## 🎖️ Certification Status: 🥇 Gold Badge (100/100)

| Attribute | Value |
|:---|:---|
| **System Code** | `CMRL` |
| **City / Region** | Chennai |
| **Operator Network** | Chennai Metro Rail Limited |
| **Source Type** | `COMMUNITY` |
| **Trust Tier** | `TIER_B` |
| **Portal Source** | [https://github.com/ungalsoththu/ChennaiGTFS](https://github.com/ungalsoththu/ChennaiGTFS) |
| **License** | Community Open Data |
| **Lifecycle Status** | `CERTIFIED` |
| **Dataset Version** | `v1.0.0` |
| **Feed Version** | `2026.04` |
| **SHA-256 Checksum** | `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2` |

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
  "fare": false,
  "accessibility": false,
  "indoor": false,
  "commercial": false,
  "tdse": true
}
```

---

## 🔄 TDSE Target Strategy
- **Primary Source**: `COMMUNITY`
- **Backup Source**: `TDSE`
- **Audit Notes**: Community GTFS feed utilizing frequencies.txt for headway representation.
