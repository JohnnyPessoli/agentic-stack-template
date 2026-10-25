#!/usr/bin/env node

import { runSetup } from "../lib/setup.mjs";

const status = await runSetup(process.argv.slice(2));
process.exitCode = status;
