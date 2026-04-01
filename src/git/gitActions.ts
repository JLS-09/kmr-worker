import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { simpleGit, SimpleGit, CleanOptions } from 'simple-git';
import { scheduleJob } from "node-schedule";
import { Mod } from "src/models/mod.model";
import { Version } from "src/models/version.model";
import { ModUpdate } from "src/types/mod";
import { VersionUpdate } from "src/types/version";
import pino from "pino";

const logger = pino({
  transport: {
    target: 'pino-pretty'
  },
})

let git: SimpleGit = simpleGit("./public/").clean(CleanOptions.FORCE);

let currentCommitHash: String | undefined;

async function performGitActions() {
  try {
    if (!existsSync("./public/CKAN-meta")) {
      logger.info("No repo detected, cloning...");
      await git.clone("https://github.com/KSP-CKAN/CKAN-meta.git");
      logger.info("Repo cloned successfully");
      await populateMods();
    } else {
      await checkForNewCommitsAndPull();
    }
  } catch (error) {
    logger.error(`Error cloning CKAN-meta: ${error.message}`);
  }
}

async function checkForNewCommitsAndPull() {
  let newLog;

  await git.cwd({ path: "./public/CKAN-meta"});

  if (!currentCommitHash) {
    logger.info("Current commit hash is empty, getting it...");
    currentCommitHash = await git.revparse(['HEAD']);
    logger.info("Saved current commit hash");
  }
  
  try {
    logger.info("Looking for new commits, fetching repo...");
    newLog = await git.fetch().log(['origin/master']);
    logger.info("fetching succesfull");
  } catch (error) {
    logger.error(`Error fetching CKAN-meta: ${error.message}`);
  }

  if (!newLog || !newLog.latest || !currentCommitHash) {
    logger.error("Something went wrong: newLog, newLog.latest or currentCommitHash is undefined");
    return;
  }

  const newCommitHash = newLog.latest.hash;

  logger.info("Comparing hashes...");
  if (currentCommitHash && newCommitHash && currentCommitHash !== newCommitHash) {
    try {
      logger.info("New commit detected, pulling...");
      await git.pull("origin", "master", ['--no-rebase']);
      logger.info("Pulling succesfull");
      currentCommitHash = newCommitHash;
      logger.info("Saved new commit hash")
      await populateMods();
    } catch (error) {
      logger.error(`Error pulling CKAN-meta: ${error.message}`);
    }
  } else {
    logger.info("No new commit, waiting...");
  }
}

async function populateMods() {
  const files: string[] = [];
  const mods = [];
  const versions = [];
  readdirSync("./public/CKAN-meta/").forEach(mod => files.push(mod));
  
  logger.info("Formatting mods and versions in correct format...");
  for (const file of files) {
    const stats = statSync(`./public/CKAN-meta/${file}`);
    if (!file.startsWith(".") && stats.isDirectory()) {
      const versionIds: string[] = [];
      readdirSync(`./public/CKAN-meta/${file}`).forEach(version => {
        if (version.endsWith(".ckan")) {
          versionIds.push(version);
        }
      });
      
      if (versionIds.length > 0) {
        const latestVersion = JSON.parse(readFileSync(`./public/CKAN-meta/${file}/${versionIds[versionIds.length - 1]}`, { encoding: "utf8" }));
        mods.push(new Mod({
          _id: latestVersion.identifier,
          name: latestVersion.name,
          abstract: latestVersion.abstract,
          author: Array.isArray(latestVersion.author) ? latestVersion.author : [latestVersion.author],
          description: latestVersion.description,
          release_status: latestVersion.release_status,
          tags: latestVersion.tags,
          resources: latestVersion.resources
        }))      
      }

      for (const version of versionIds) {
        const versionJson = JSON.parse(readFileSync(`./public/CKAN-meta/${file}/${version}`, { encoding: "utf8" }));

        versions.push(new Version({ 
          _id: version.slice(0, version.lastIndexOf(".")),
          spec_version: versionJson.spec_version,
          identifier: versionJson.identifier,
          download: versionJson.download,
          license: versionJson.license,
          version: versionJson.version,
          install: versionJson.install,
          comment: versionJson.comment,
          ksp_version: versionJson.ksp_version,
          ksp_version_min: versionJson.ksp_version_min,
          ksp_version_max: versionJson.ksp_version_max,
          ksp_version_strict: versionJson.ksp_version_strict,
          localizations: versionJson.localizations,
          download_size: versionJson.download_size,
          download_hash: versionJson.download_hash,
          download_content_type: versionJson.download_content_type,
          install_size: versionJson.install_size,
          release_date: versionJson.release_date,
          depends: versionJson.depends,
          recommends: versionJson.recommends,
          suggests: versionJson.suggests,
          supports: versionJson.supports,
          conflicts: versionJson.conflicts,
          replaced_by: versionJson.replaced_by,
          kind: versionJson.kind,
          provides: versionJson.provides,
        }))

      }
    }
  }
  logger.info("Correctly formatted mods and versions!")

  await bulkSaveMods(mods as ModUpdate[]).then(console.log).catch(console.error);
  await bulkSaveVersions(versions as VersionUpdate[]).then(console.log).catch(console.error);
  
}

async function bulkSaveMods(mods: ModUpdate[]) {
  logger.info("Uploading mods...")
  const operations: any = mods.map(mod => ({
    updateOne: {
      filter: { _id: mod._id },
      update: { $set: {
          name: mod.name,
          abstract: mod.abstract,
          author: mod.author,
          description: mod.description,
          release_status: mod.release_status,
          tags: mod.tags,
          resources: mod.resources
      }},
      upsert: true
      }
    }));
  const result = await Mod.bulkWrite(operations);
  if (result.isOk()) {
    logger.info("Done uploading mods!");
  } else {
    logger.error(`Error uploading mods`);
  }
  return result;
}

async function bulkSaveVersions(versions: VersionUpdate[]) {
  logger.info("Uploading versions...")
  const operations: any = versions.map(version => ({
    updateOne: {
      filter: { _id: version._id },
      update: { $set: { 
          spec_version: version.spec_version,
          identifier: version.identifier,
          download: version.download,
          license: version.license,
          version: version.version,
          install: version.install,
          comment: version.comment,
          ksp_version: version.ksp_version,
          ksp_version_min: version.ksp_version_min,
          ksp_version_max: version.ksp_version_max,
          ksp_version_strict: version.ksp_version_strict,
          localizations: version.localizations,
          download_size: version.download_size,
          download_hash: version.download_hash,
          download_content_type: version.download_content_type,
          install_size: version.install_size,
          release_date: version.release_date,
          depends: version.depends,
          recommends: version.recommends,
          suggests: version.suggests,
          supports: version.supports,
          conflicts: version.conflicts,
          replaced_by: version.replaced_by,
          kind: version.kind,
          provides: version.provides,
        }},
      upsert: true
      }
    }));
  const result = await Version.bulkWrite(operations);
  if (result.isOk()) {
    logger.info("Done uploading versions!");
  } else {
    logger.error(`Error uploading versions`);
  }
  return result;
}

export default async function scheduleGitActions() {
  await performGitActions();
  scheduleJob('*/30 * * * *', performGitActions);
}
