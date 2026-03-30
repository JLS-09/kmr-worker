import mongoose from "mongoose";

const VersionSchema = new mongoose.Schema({
  spec_version: { type: mongoose.Schema.Types.Mixed, required: true }, // Could be Number or String
  _id: String,
  identifier: { type: String, required: true },
  download: mongoose.Schema.Types.Mixed, // String or [String]
  license: {type: mongoose.Schema.Types.Mixed, required: true}, // String or [String]
  version: { type: String, required: true },
  install: [mongoose.Schema.Types.Mixed],
  comment: String,
  ksp_version: {type: String, default: "any"},
  ksp_version_min: String,
  ksp_version_max: String,
  ksp_version_strict: {type: Boolean, default: false},
  localizations: [String],
  download_size: Number,
  download_hash: {
    sha1: String,
    sha256: String,
  },
  download_content_type: String,
  install_size: Number,
  release_date: Date,
  depends: [mongoose.Schema.Types.Mixed],
  recommends: [mongoose.Schema.Types.Mixed],
  suggests: [mongoose.Schema.Types.Mixed],
  supports: [mongoose.Schema.Types.Mixed],
  conflicts: [mongoose.Schema.Types.Mixed],
  replaced_by: {
    name: String,
    version: String,
    min_version: String,
  },
  kind: { type: String, enum: ["package", "metapackage", "dlc"] },
  provides: [String],
});

export const Version = mongoose.model("Version", VersionSchema);
