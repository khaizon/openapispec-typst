#import "/templates/lib.typ": api-document
#import "/build/generated/data.typ": spec
#import "/build/generated/enhancements.typ": (
  enhancement-groups, enhancement-spec-id, show-enhancements,
)

#api-document(
  spec,
  enhancement-groups: enhancement-groups,
  spec-id: enhancement-spec-id,
  show-enhancements: show-enhancements,
)
