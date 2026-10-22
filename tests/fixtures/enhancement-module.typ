#let meta = (
  version: 1,
  specs: ("pocketdex",),
  priority: 5,
)

#let overrides = (
  overview: (
    description: (
      prepend: [PREPENDED OVERVIEW],
      append: [APPENDED OVERVIEW],
    ),
  ),
  tags: (
    "Trainers": (
      description: (append: [APPENDED TAG]),
    ),
  ),
  operations: (
    registerTrainer: (
      purpose: [REPLACED PURPOSE],
      requestBody: (append: [APPENDED BODY]),
    ),
    recordEncounter: (
      notes: (append: [APPENDED NOTES]),
    ),
    listSpecies: (
      parameters: (
        query: (
          pageNo: (append: [APPENDED PARAM]),
        ),
      ),
    ),
  ),
  schemas: (
    SpeciesDetail: (
      description: (append: [APPENDED SCHEMA]),
      fields: (
        habitat: (append: [APPENDED FIELD]),
      ),
    ),
  ),
)
