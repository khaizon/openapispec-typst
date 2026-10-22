// PDF-only enhancements for the fictional PocketDex demo.
#let meta = (
  version: 1,
  specs: ("pocketdex",),
  priority: 0,
)

#let overrides = (
  overview: (
    description: (
      append: [
        This PDF also demonstrates authored enhancements: prose in this
        section and the appendix at the end are layered on top of the OpenAPI
        source without changing the API contract.
      ],
    ),
  ),
  operations: (
    recordEncounter: (
      notes: (
        append: [
          Poll the returned order identifier with the Get Encounter Order
          endpoint to follow processing.
        ],
      ),
    ),
  ),
)
