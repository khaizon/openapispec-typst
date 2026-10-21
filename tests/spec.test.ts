import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  FIXTURES,
  PINNED_DATE,
  SPEC,
  referenceModel,
} from "./helpers.js";
import { buildModel } from "../src/model.js";
import { loadSpec } from "../src/spec.js";

const model = referenceModel();
const byId = (id: string) => model.operations.find((operation: any) => operation["operation-id"] === id);
const byName = (name: string) => model.schemas.find((schema: any) => schema.name === name);
const dataModel = (name: string) => model["data-models"].find((schema: any) => schema.name === name);

describe("PocketDex reference spec", () => {
  test("counts are stable", () => {
    assert.deepEqual(model.stats, {
      paths: 14,
      operations: 14,
      tags: 6,
      schemas: 47,
      "named-responses": 11,
      "named-parameters": 8,
    });
    assert.equal(model["data-models"].length, 43);
  });

  test("operations cover every path and disambiguate duplicate summaries", () => {
    const raw = loadSpec(SPEC);
    assert.equal(model.operations.length, 14);
    assert.deepEqual(
      new Set(model.operations.map((operation: any) => operation.path)),
      new Set(Object.keys(raw.paths)),
    );
    const headings = model.operations.map((operation: any) => operation.heading);
    assert.equal(new Set(headings).size, headings.length);
    assert.ok(byId("getSpeciesStats").heading.endsWith("(v1)"));
    assert.ok(byId("getSpeciesStatsV2").heading.endsWith("(v2)"));
    assert.equal(byId("legacySpeciesSearch").deprecated, true);
  });

  test("allOf composition is merged", () => {
    const node = byName("SpeciesDetail").node;
    assert.equal(node.kind, "object");
    const names = node.properties.map((property: any) => property.name);
    for (const expected of ["speciesId", "name", "types", "stats", "abilities"]) {
      assert.ok(names.includes(expected), "missing " + expected);
    }
    assert.equal(node["property-count"], 10);
    assert.equal(node["required-count"], 8);
  });

  test("request bodies carry inline comprehension models", () => {
    const register = byId("registerTrainer")["request-body"].content[0]["request-model"];
    assert.equal(register.kind, "object");
    assert.deepEqual(
      register.fields.map((field: any) => field.name),
      ["displayName", "homeRegion", "favoriteType", "starterSpeciesId"],
    );

    const party = byId("updateTrainerParty")["request-body"].content[0]["request-model"];
    assert.ok(party.fields.some((field: any) => field.name === "favoriteType"));

    const encounter = byId("recordEncounter")["request-body"].content[0]["request-model"];
    assert.equal(encounter.kind, "one-of");
    assert.equal(encounter["variant-count"], 3);
    assert.deepEqual(
      encounter.variants.map((variant: any) => variant.label).sort(),
      ["PartyEncounterRequest", "RouteEncounterRequest", "SingleEncounterRequest"],
    );
    for (const variant of encounter.variants) assert.ok(variant.note);
  });

  test("data models are classified and versioned models are diffed", () => {
    const roles: Record<string, number> = {};
    for (const schema of model["data-models"]) {
      roles[schema.role] = (roles[schema.role] ?? 0) + 1;
    }
    assert.deepEqual(roles, {
      primary: 6,
      versioned: 2,
      envelope: 5,
      small: 25,
      helper: 5,
    });
    const v2 = dataModel("V2SpeciesStats");
    assert.equal(v2["diff-from"], "SpeciesStats");
    assert.deepEqual(
      v2["diff-changes"].map((change: any) => change.field).sort(),
      ["balanceRevision", "updatedAt"],
    );
  });

  test("authentication is deduplicated to a default plus exceptions", () => {
    assert.deepEqual(model.authentication.default.requirements, [["TrainerToken"]]);
    assert.equal(model.authentication.default.count, 13);
    assert.equal(model.authentication.default.total, 14);
    assert.deepEqual(
      model.authentication.exceptions.map((entry: any) => entry.heading),
      ["Trainer Login"],
    );
    assert.equal(byId("loginTrainer")["security-exception"], true);
    assert.equal(byId("listSpecies")["security-exception"], false);
  });

  test("error reference is deduplicated and uses the standard envelope", () => {
    const error = model["error-reference"];
    assert.equal(error.envelope.name, "NewApiErrorResponse");
    assert.ok(error.models.some((entry: any) => entry.name === "LegacyAuthError"));
    assert.equal(error.examples.length, 8);
    assert.equal(error["examples-total"], 8);
    for (const example of error.examples) {
      assert.doesNotThrow(() => JSON.parse(example["value-json"]));
    }
    const statuses = new Map(error.statuses.map((entry: any) => [entry.code, entry.meaning]));
    assert.equal(statuses.get("422"), "Unprocessable Content");
    assert.equal(statuses.get("4XX"), "Any 4xx client error");
    assert.equal(statuses.get("5XX"), "Any 5xx server error");
  });

  test("conventions and enums are derived once", () => {
    assert.deepEqual(
      model.conventions.pagination.parameters.map((parameter: any) => parameter.name),
      ["pageNo", "pageSize"],
    );
    assert.equal(model.conventions.pagination["model-name"], "Pagination");
    assert.deepEqual(
      model.conventions.sorting.parameters.map((parameter: any) => parameter.name),
      ["sortBy", "sortOrder"],
    );
    assert.equal(model.conventions["datetime-example"], "2026-12-31T23:59:59Z");
    const enums = new Map(
      model["enum-reference"].map((entry: any) => [entry.name, entry.values]),
    );
    assert.deepEqual(enums.get("PokemonType"), [
      "FIRE", "WATER", "GRASS", "ELECTRIC", "ROCK",
      "GHOST", "FLYING", "NORMAL", "ICE",
    ]);
    assert.deepEqual(enums.get("SortOrder"), ["ASC", "DESC"]);
  });

  test("specification notes flag source observations", () => {
    const notes = model["specification-notes"].join("\n");
    assert.match(notes, /Potential specification inconsistency: response 204/);
    assert.match(notes, /Breeding/);
    assert.match(notes, /Duplicate operation summaries/);
    assert.match(notes, /4XX and 5XX/);
  });

  test("all examples are valid JSON and modes change density", () => {
    const examples: any[] = [];
    for (const operation of model.operations) {
      for (const response of operation.responses) {
        for (const entry of response.content) examples.push(...entry.examples);
      }
      const body = operation["request-body"];
      if (body) for (const entry of body.content) examples.push(...entry.examples);
    }
    assert.ok(examples.length > 25);
    for (const example of examples) {
      assert.doesNotThrow(() => JSON.parse(example["value-json"]));
    }

    const concise = buildModel(loadSpec(SPEC), PINNED_DATE, { mode: "concise" });
    const conciseRegister = concise.operations.find((operation: any) => operation["operation-id"] === "registerTrainer");
    assert.equal(conciseRegister["request-body"].content[0]["examples-show"].length, 1);

    const exhaustive = buildModel(loadSpec(SPEC), PINNED_DATE, { mode: "exhaustive" });
    const exhaustiveRegister = exhaustive.operations.find((operation: any) => operation["operation-id"] === "registerTrainer");
    assert.equal(exhaustiveRegister["request-body"].content[0]["examples-show"].length, 4);
    assert.equal(exhaustive.config.mode, "exhaustive");
  });

  test("fixture specs normalise without crashes", () => {
    const minimal = buildModel(loadSpec(FIXTURES + "/minimal.yaml"), PINNED_DATE);
    assert.equal(minimal.operations.length, 1);
    assert.equal(minimal["error-reference"], null);

    const rich = buildModel(loadSpec(FIXTURES + "/rich.yaml"), PINNED_DATE);
    assert.equal(rich.operations.length, 5);
    const create = rich.operations.find((operation: any) => operation["operation-id"] === "createWidget");
    assert.equal(create["request-body"].content[0]["media-type"], "multipart/form-data");
    const compose = rich.operations.find((operation: any) => operation["operation-id"] === "composeWidget");
    assert.equal(compose["request-body"].content[0]["request-model"].kind, "one-of");
    assert.equal(rich.schemas.find((schema: any) => schema.name === "Node").node.properties
      .find((property: any) => property.name === "children").node.items.kind, "ref");
  });
});
