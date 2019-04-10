///<reference path="torrent-search-api.d.ts"/>
import { Command, flags } from "@oclif/command";
import chalk from "chalk";
import * as fs from "fs-extra";
import * as inquirer from "inquirer";
import open = require("open");
import { join } from "path";
import * as path from "path";
import {
  disableProvider,
  enableProvider,
  getActiveProviders,
  getMagnet,
  getProviders,
  loadProviders,
  search,
  Torrent,
} from "torrent-search-api";

loadProviders(join(__dirname, "./providers"));

[
  "1337x",
  "ExtraTorrent",
  "KickassTorrents",
  "Nyaa",
  "Rarbg",
  "ThePirateBay",
  "Torrent9",
  "Torrentz2",
].forEach(p => enableProvider(p));

class Torrentsearch extends Command {
  public static description = "search for torrents";

  public static flags = {
    help: flags.help({ char: "h" }),
    version: flags.version({ char: "v" }),

    category: flags.enum({
      char: "c",
      default: "All",
      options: ["All", "Movies", "TV", "Games", "Music", "Applications"],
    }),

    limit: flags.integer({
      char: "l",
      default: 30,
    }),
  };

  public static args = [{ name: "query" }];

  public async run() {
    const { args, flags: parsedFlags } = this.parse(Torrentsearch);
    let config: { [key: string]: any } = {};
    try {
      config = await fs.readJSON(
        path.join(this.config.configDir, "config.json"),
      );
    } catch (err) {
      /*empty*/
    }

    Object.keys(config).forEach(provider => {
      enableProvider(
        provider,
        config[provider].username,
        config[provider].password,
      );
    });

    await this.selectProviders();
    const query = await this.getQuery(args);

    const torrents = await search(
      query,
      parsedFlags.category,
      parsedFlags.limit!,
    );

    await this.selectTorrent(torrents);
  }

  private async selectProviders() {
    const publicProviders = getProviders()
      .filter(p => p.public)
      .map(p => p.name);
    const activeProviders = getActiveProviders().map(p => p.name);
    const providers = publicProviders
      .concat(activeProviders)
      .filter((p, i, arr) => arr.indexOf(p) === i);

    const results = await inquirer.prompt<{ providers: string[] }>({
      message: "Select providers",
      name: "providers",
      type: "checkbox",

      choices: providers.map(value => ({
        checked: activeProviders.includes(value),
        value,
      })),
    });
    results.providers
      .filter(p => !activeProviders.includes(p))
      .forEach(p => enableProvider(p));
    providers
      .filter(p => !results.providers.includes(p))
      .forEach(p => disableProvider(p));
  }

  private async getQuery(args: any): Promise<string> {
    if (args.query) {
      return args.query;
    }

    const result = await inquirer.prompt<{ query: string }>({
      message: "Search query",
      name: "query",
      type: "input",
    });
    return result.query;
  }

  private torrentRow(torrent: Torrent) {
    const parts = [
      chalk.yellow(torrent.title),
      chalk.blue(torrent.size),
      chalk.green((torrent.seeds || 0).toString()),
      chalk.red((torrent.peers || 0).toString()),
    ];

    if (torrent.time) {
      parts.push(torrent.time);
    }

    return parts.join(" ");
  }

  private async selectTorrent(torrents: Torrent[]) {
    for (const [i, torrent] of torrents.entries()) {
      this.log(
        `${chalk.magentaBright(`${i + 1}`)}) ${this.torrentRow(torrent)}`,
      );
    }

    const results = await inquirer.prompt<{ index: number }>({
      message: "Select a torrent",
      name: "index",
      type: "number",
      validate: (n: number) =>
        n > 0 && n <= torrents.length ? true : "Not a valid option",
    });
    const selectedTorrent = torrents[results.index - 1];

    const magnet = await getMagnet(selectedTorrent);
    await open(magnet || selectedTorrent.link || selectedTorrent.desc);
  }
}

export = Torrentsearch;
