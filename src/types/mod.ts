import mongoose from "mongoose";

export type ModUpdate = {
  _id: string,
  name: string,
  abstract: string,
  author: mongoose.Schema.Types.Mixed,
  description: string,
  release_status: string,
  tags: string[],
  resources: {
    homepage: string,
    bugtracker: string,
    discussions: string,
    license: string,
    repository: string,
    ci: string,
    spacedock: string,
    curse: string,
    manual: string,
    metanetkan: string,
    'remote-avc': string,
    'remote-swinfo': string,
    store: string,
    steamstore: string,
    gogstore: string,
    epicstore: string,
  },
}
