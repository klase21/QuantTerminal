import { DATASET_REGISTRY } from "@/lib/data-platform/registry"
import { validateDatasetRegistry, type DatasetRegistryEntry } from "@/lib/data-platform/contracts"
const entry: DatasetRegistryEntry = DATASET_REGISTRY[0]
if (validateDatasetRegistry(DATASET_REGISTRY).length) throw new Error("Dataset registry invalid")
void entry
// @ts-expect-error Dataset classes are controlled.
const invalid: DatasetRegistryEntry = { ...entry, datasetClass: "FACT" }
void invalid
