// Layout, theme and components for the generated OpenAPI reference.
//
// The converter emits only data (build/generated/data.typ); everything visual
// lives here so the document can be restyled without touching Python.

#import "@preview/cmarker:0.1.6": render as cmark

// ---------------------------------------------------------------- theme ---

#let body-font = "Inter"
#let display-font = "Montserrat"
#let mono-font = "JetBrains Mono"

#let ink = rgb("#101828")
#let muted = rgb("#5B6475")
#let faint = rgb("#8A94A6")
#let border = rgb("#E4E8F0")
#let surface = rgb("#F7F8FA")
#let paper = rgb("#FFFFFF")
#let accent = rgb("#2C46D6")
#let accent-ink = rgb("#1B2C8F")
#let accent-soft = rgb("#EEF1FD")
#let teal = rgb("#0E9384")
#let code-bg = rgb("#F6F8FB")
#let code-border = rgb("#E2E7F0")

#let running-endpoint = state("running-endpoint", none)

#let method-colors = (
  get: rgb("#067647"),
  post: rgb("#175CD3"),
  put: rgb("#B54708"),
  patch: rgb("#B54708"),
  delete: rgb("#B42318"),
  options: rgb("#475467"),
  head: rgb("#475467"),
  trace: rgb("#475467"),
)
#let method-tints = (
  get: rgb("#E7F6EE"),
  post: rgb("#E8F1FE"),
  put: rgb("#FEF3E7"),
  patch: rgb("#FEF3E7"),
  delete: rgb("#FDECEC"),
  options: rgb("#F2F4F7"),
  head: rgb("#F2F4F7"),
  trace: rgb("#F2F4F7"),
)

#let status-colors = (
  "2xx": rgb("#067647"),
  "3xx": rgb("#175CD3"),
  "4xx": rgb("#B54708"),
  "5xx": rgb("#B42318"),
  "default": rgb("#475467"),
)
#let status-tints = (
  "2xx": rgb("#E7F6EE"),
  "3xx": rgb("#E8F1FE"),
  "4xx": rgb("#FEF3E7"),
  "5xx": rgb("#FDECEC"),
  "default": rgb("#F2F4F7"),
)

#let method-color(method) = method-colors.at(
  lower(method),
  default: rgb("#475467"),
)
#let method-tint(method) = method-tints.at(
  lower(method),
  default: rgb("#F2F4F7"),
)

// --------------------------------------------------------------- helpers ---

#let md(source) = {
  if source == none or source == "" { return none }
  set par(spacing: 0.7em)
  show list: set block(above: 0.3em, below: 0.3em)
  show enum: set block(above: 0.3em, below: 0.3em)
  cmark(source, h1-level: 6)
}

#let md-inline(source) = {
  if source == none or source == "" { return none }
  set par(spacing: 0.25em)
  show list: set block(above: 0pt, below: 0pt)
  show enum: set block(above: 0pt, below: 0pt)
  cmark(source, h1-level: 6)
}

#let chip(body, fill: surface, stroke: border, ink-color: muted) = box(
  fill: fill,
  stroke: 0.5pt + stroke,
  radius: 3pt,
  inset: (x: 4.5pt, y: 1.4pt),
  text(font: mono-font, size: 6.8pt, fill: ink-color, body),
)

#let method-badge(method) = box(
  width: 44pt,
  align(center, box(
    fill: method-color(method),
    radius: 3.5pt,
    inset: (x: 7pt, y: 2.6pt),
    text(
      font: mono-font,
      size: 7pt,
      weight: 700,
      fill: white,
      tracking: 0.5pt,
      upper(method),
    ),
  )),
)

#let status-badge(status, class) = box(
  fill: status-tints.at(class, default: rgb("#F2F4F7")),
  radius: 3pt,
  inset: (x: 4.5pt, y: 1.8pt),
  text(
    font: mono-font,
    size: 6.9pt,
    weight: 700,
    fill: status-colors.at(class, default: rgb("#475467")),
    status,
  ),
)

#let deprecated-badge = box(
  fill: rgb("#FDECEC"),
  radius: 3pt,
  inset: (x: 4pt, y: 1.2pt),
  text(
    font: mono-font,
    size: 6.2pt,
    weight: 700,
    fill: rgb("#B42318"),
    "DEPRECATED",
  ),
)

#let required-badge(required) = if required {
  text(size: 7.2pt, weight: 600, fill: rgb("#067647"), "Required")
} else {
  text(size: 7.2pt, fill: faint, "Optional")
}

#let path-display(path) = {
  set text(hyphenate: false)
  let parts = path.split("/")
  for (index, part) in parts.enumerate() {
    if index > 0 {
      text(fill: faint, "/")
      text("\u{200B}")
    }
    if part.starts-with("{") {
      text(fill: accent, weight: 600, part)
    } else {
      text(part)
    }
  }
}

#let subsection(title, trailing: none) = {
  v(0.85em, weak: true)
  block(width: 100%, below: 0.3em, {
    text(font: display-font, size: 9.1pt, weight: 700, fill: ink, title)
    if trailing != none {
      h(0.7em)
      trailing
    }
    v(-1pt)
    line(length: 100%, stroke: 0.5pt + border)
  })
}

#let field-label(text-body) = text(
  size: 6.5pt,
  weight: 700,
  tracking: 0.9pt,
  fill: faint,
  text-body,
)

#let code-block(source) = raw(source, lang: "json", block: true)



#let schema-type(node) = {
  if node == none { return text(fill: faint, "—") }
  if node.kind == "ref" {
    link(label("schema-" + node.ref), text(
      font: mono-font,
      size: 7.4pt,
      fill: accent,
      "↗ " + node.ref,
    ))
  } else if node.kind == "array" {
    text(font: mono-font, size: 7.4pt, fill: ink, "array<")
    schema-type(node.items)
    text(font: mono-font, size: 7.4pt, fill: ink, ">")
  } else if node.kind == "object" {
    if node.property-count == 0 and node.additional != none {
      text(font: mono-font, size: 7.4pt, fill: teal, "map<")
      schema-type(node.additional)
      text(font: mono-font, size: 7.4pt, fill: teal, ">")
    } else {
      text(font: mono-font, size: 7.4pt, fill: teal, "object")
    }
  } else if node.kind == "one-of" or node.kind == "any-of" {
    text(font: mono-font, size: 7.4pt, fill: ink, node.type-label)
  } else {
    text(font: mono-font, size: 7.4pt, fill: ink, node.type-label)
  }
}


#let compact-meta(node, default-text: none, constraints: none) = {
  if node.enum-values.len() > 0 {
    linebreak()
    text(size: 6.7pt, fill: muted, "enum: ")
    for (index, value) in node.enum-values.enumerate() {
      if index > 0 { text(size: 6.7pt, fill: faint, " | ") }
      text(font: mono-font, size: 6.7pt, fill: muted, value)
    }
  }
  let extras = ()
  if default-text != none { extras.push("default: " + default-text) }
  if constraints != none { extras.push(constraints) }
  if extras.len() > 0 {
    linebreak()
    for (index, item) in extras.enumerate() {
      if index > 0 { text(size: 6.7pt, fill: faint, " · ") }
      text(size: 6.7pt, fill: muted, item)
    }
  }
}

#let field-table(fields, show-constraints: false) = {
  let cells = ()
  for field in fields {
    cells.push(block({
      text(font: mono-font, size: 7.6pt, weight: 600, field.name)
      if field.deprecated {
        h(4pt)
        deprecated-badge
      }
    }))
    cells.push(block(spacing: 1.5pt, {
      schema-type(field.node)
      compact-meta(
        field.node,
        default-text: field.node.default-text,
        constraints: field.constraints,
      )
    }))
    cells.push(if field.required {
      text(size: 7.2pt, weight: 600, fill: rgb("#067647"), "Yes")
    } else {
      text(size: 7.2pt, fill: faint, "—")
    })
    cells.push(block({
      md-inline(field.description)
      if (
        field.example-short != none
          and (
            field.node.kind != "array" and field.node.kind != "object"
              or field.example-short.len() <= 60
          )
      ) {
        text(size: 6.7pt, fill: muted, "  ·  Example: ")
        text(font: mono-font, size: 6.7pt, fill: muted, field.example-short)
      }
    }))
  }
  table(
    columns: (1.6fr, 1.35fr, 0.42fr, 2.65fr),
    stroke: (x: none, y: 0.4pt + border),
    inset: (x: 6pt, y: 6pt),
    align: (left, left, center, left),
    table.header(
      repeat: true,
      table.cell(fill: surface)[#field-label("Field")],
      table.cell(fill: surface)[#field-label("Type")],
      table.cell(fill: surface, align: center)[#field-label("Required")],
      table.cell(fill: surface)[#field-label("Description")],
    ),
    ..cells,
  )
}

#let request-variants-table(model) = {
  let cells = ()
  for variant in model.variants {
    cells.push(block({
      link(
        label("schema-" + variant.name),
        text(font: mono-font, size: 7.6pt, fill: accent, variant.label),
      )
      if variant.name != variant.label {
        linebreak()
        text(font: mono-font, size: 6.2pt, fill: faint, variant.name)
      }
    }))
    cells.push(block(spacing: 1.5pt, {
      let required = variant.fields.filter(field => field.required)
      if required.len() == 0 {
        text(size: 7pt, fill: faint, "—")
      } else {
        for (index, field) in required.enumerate() {
          if index > 0 { text(fill: faint, " · ") }
          text(font: mono-font, size: 7pt, fill: muted, field.name)
        }
      }
    }))
    cells.push(text(size: 7.4pt, fill: muted, variant.note))
  }
  table(
    columns: (1.3fr, 1.7fr, 2fr),
    stroke: (x: none, y: 0.4pt + border),
    inset: (x: 6pt, y: 6pt),
    align: (left, left, left),
    table.header(
      repeat: true,
      table.cell(fill: surface)[#field-label("Variant")],
      table.cell(fill: surface)[#field-label("Required fields")],
      table.cell(fill: surface)[#field-label("When to use")],
    ),
    ..cells,
  )
}

// ---------------------------------------------------------- schema helpers ---

#let schema-note(node) = {
  if node == none { return }
  block(spacing: 1.5pt, {
    if node.enum-values.len() > 0 {
      text(size: 6.6pt, fill: muted, [enum: ])
      for (index, value) in node.enum-values.enumerate() {
        if index > 0 { text(size: 6.6pt, fill: faint, " · ") }
        text(font: mono-font, size: 6.6pt, fill: muted, value)
      }
    }
    if node.constraints != none {
      linebreak()
      text(size: 6.6pt, fill: faint, node.constraints)
    }
  })
}

#let enum-note(node) = {
  if node.enum-values.len() > 0 {
    linebreak()
    text(size: 6.6pt, fill: muted, [enum: ])
    for (index, value) in node.enum-values.enumerate() {
      if index > 0 { text(size: 6.6pt, fill: faint, " | ") }
      text(font: mono-font, size: 6.6pt, fill: muted, value)
    }
  }
}

#let schema-props-table(node) = {
  let cells = ()
  for property in node.properties {
    let type-cell = block(spacing: 1.5pt, {
      schema-type(property.node)
      enum-note(property.node)
    })
    let constraints-cell = block(spacing: 1.5pt, {
      if property.constraints != none {
        text(size: 6.7pt, fill: muted, property.constraints)
      }
      if property.node.default-text != none {
        if property.constraints != none { linebreak() }
        text(size: 6.6pt, fill: faint, [default: ])
        text(
          font: mono-font,
          size: 6.6pt,
          fill: muted,
          property.node.default-text,
        )
      }
      if property.constraints == none and property.node.default-text == none {
        text(size: 7pt, fill: faint, "—")
      }
    })
    let description-cell = block(spacing: 1.5pt, {
      md-inline(property.description)
      if (
        property.example-short != none
          and (
            property.node.kind != "array" and property.node.kind != "object"
              or property.example-short.len() <= 60
          )
      ) {
        linebreak()
        text(size: 6.6pt, fill: muted, [Example: ])
        text(font: mono-font, size: 6.6pt, fill: muted, property.example-short)
      }
    })
    cells.push([
      #text(font: mono-font, size: 7.6pt, weight: 600, property.name)
      #if property.deprecated {
        h(4pt)
        deprecated-badge
      }
    ])
    cells.push(type-cell)
    cells.push(if property.required {
      text(size: 7.2pt, weight: 600, fill: rgb("#067647"), "Yes")
    } else {
      text(size: 7.2pt, fill: faint, "—")
    })
    cells.push(constraints-cell)
    cells.push(description-cell)
  }
  table(
    columns: (1.45fr, 1fr, 0.38fr, 1fr, 2.15fr),
    stroke: (x: none, y: 0.4pt + border),
    inset: (x: 6pt, y: 5pt),
    align: (left, left, center, left, left),
    table.header(
      repeat: true,
      table.cell(fill: surface)[#field-label("Field")],
      table.cell(fill: surface)[#field-label("Type")],
      table.cell(fill: surface, align: center)[#field-label("Req.")],
      table.cell(fill: surface)[#field-label("Constraints")],
      table.cell(fill: surface)[#field-label("Description")],
    ),
    ..cells,
  )
}

#let schema-body(node, depth: 0) = {
  if node == none { return }
  if node.kind == "object" {
    if node.properties.len() > 0 {
      schema-props-table(node)
    } else {
      text(size: 8pt, fill: muted)[Free-form object.]
    }
    if node.additional != none {
      v(4pt)
      text(
        size: 7pt,
        fill: muted,
      )[Additional properties: #schema-type(node.additional)]
    }
    if depth < 2 {
      for property in node.properties {
        let inner = if property.node.kind == "array" {
          property.node.items
        } else { property.node }
        if (
          inner != none and inner.kind == "object" and inner.property-count > 0
        ) {
          block(
            width: 100%,
            stroke: (left: 2pt + rgb("#D6DDF8")),
            inset: (left: 11pt, top: 7pt, bottom: 2pt),
            above: 8pt,
            {
              text(
                font: mono-font,
                size: 7.8pt,
                weight: 600,
                fill: muted,
                [↳ ] + property.name,
              )
              h(6pt)
              text(size: 6.6pt, fill: faint, if property.node.kind == "array" {
                "array of nested objects"
              } else { "nested object" })
              v(3pt)
              schema-body(inner, depth: depth + 1)
            },
          )
        }
      }
    }
  } else if node.kind == "array" {
    text(size: 8pt, fill: muted)[Array of #schema-type(node.items)]
    if node.items != none and node.items.kind == "object" {
      v(4pt)
      schema-body(node.items, depth: depth)
    }
  } else if node.kind == "one-of" or node.kind == "any-of" {
    v(3pt)
    for (index, variant) in node.variants.enumerate() {
      if index > 0 { v(2pt) }
      block(
        stroke: (left: 2pt + rgb("#D6DDF8")),
        inset: (left: 9pt, top: 2pt),
        width: 100%,
        {
          text(size: 6.6pt, fill: faint, "Variant " + str(index + 1))
          v(1pt)
          if variant.kind == "ref" {
            schema-type(variant)
          } else {
            schema-body(variant, depth: depth)
          }
        },
      )
    }
  } else {
    schema-type(node)
    if node.enum-values.len() > 0 or node.constraints != none {
      v(2pt)
      schema-note(node)
    }
  }
}

#let schema-card(schema, compact: false) = {
  let body = {
    [#heading(level: 3, outlined: false)[#schema.name]#label(
        "schema-" + schema.name,
      )]
    block(
      width: 100%,
      below: if compact { 2pt } else { 4pt },
      {
        chip(
          schema.type-label,
          fill: accent-soft,
          stroke: rgb("#D7DEFA"),
          ink-color: accent-ink,
        )
        if schema.property-count > 0 {
          h(6pt)
          text(
            size: 6.8pt,
            fill: faint,
            str(schema.property-count)
              + " properties · "
              + str(schema.required-count)
              + " required",
          )
        }
      },
    )
    if schema.description != "" { md(schema.description) }
    v(if compact { 1pt } else { 2pt })
    schema-body(schema.node)
    v(if compact { 8pt } else { 16pt }, weak: true)
  }
  if compact or schema.property-count <= 6 {
    block(width: 100%, breakable: false, body)
  } else {
    body
  }
}

#let wrapper-card(schema) = {
  block(width: 100%, breakable: false, {
    [#heading(level: 3, outlined: false)[#schema.name]#label(
        "schema-" + schema.name,
      )]
    block(width: 100%, below: 3pt, {
      chip(
        "response envelope",
        fill: accent-soft,
        stroke: rgb("#D7DEFA"),
        ink-color: accent-ink,
      )
    })
    if schema.description != "" { md(schema.description) }
    let cells = ()
    for property in schema.node.properties {
      cells.push(text(font: mono-font, size: 7.4pt, weight: 600, property.name))
      cells.push(schema-type(property.node))
      cells.push(if property.required {
        text(size: 7pt, weight: 600, fill: rgb("#067647"), "Yes")
      } else {
        text(size: 7pt, fill: faint, "—")
      })
    }
    table(
      columns: (1.2fr, 1.9fr, 0.5fr),
      stroke: (x: none, y: 0.4pt + border),
      inset: (x: 6pt, y: 4pt),
      align: (left, left, center),
      table.header(
        repeat: true,
        table.cell(fill: surface)[#field-label("Field")],
        table.cell(fill: surface)[#field-label("Type")],
        table.cell(fill: surface)[#field-label("Required")],
      ),
      ..cells,
    )
  })
  v(8pt, weak: true)
}

#let versioned-card(schema) = {
  block(width: 100%, breakable: false, {
    [#heading(level: 3, outlined: false)[#schema.name]#label(
        "schema-" + schema.name,
      )]
    block(width: 100%, below: 3pt, {
      chip(
        "differences from previous version",
        fill: rgb("#FEF3E7"),
        stroke: rgb("#FDE3C6"),
        ink-color: rgb("#B54708"),
      )
      h(6pt)
      text(size: 7.2pt, fill: muted, "Base model: ")
      link(
        label("schema-" + schema.diff-from),
        text(font: mono-font, size: 7.2pt, fill: accent, schema.diff-from),
      )
    })
    if schema.description != "" { md(schema.description) }
    if schema.diff-changes.len() == 0 {
      text(
        size: 7.6pt,
        fill: muted,
        "No field differences from the base model.",
      )
    } else {
      let cells = ()
      for change in schema.diff-changes {
        cells.push(text(
          font: mono-font,
          size: 7.2pt,
          weight: 600,
          change.field,
        ))
        cells.push(text(size: 7.2pt, fill: muted, change.change))
        cells.push(text(
          font: mono-font,
          size: 6.8pt,
          fill: muted,
          if change.detail == "" { "—" } else { change.detail },
        ))
      }
      table(
        columns: (1.3fr, 1fr, 2fr),
        stroke: (x: none, y: 0.4pt + border),
        inset: (x: 6pt, y: 4pt),
        align: (left, left, left),
        table.header(
          repeat: true,
          table.cell(fill: surface)[#field-label("Field")],
          table.cell(fill: surface)[#field-label("Change")],
          table.cell(fill: surface)[#field-label("Detail")],
        ),
        ..cells,
      )
      text(
        size: 6.7pt,
        fill: faint,
        "Unchanged fields are defined by the base model. No differences are hidden.",
      )
    }
  })
  v(8pt, weak: true)
}

// ------------------------------------------------------------- components ---

#let stat-card(value, label) = block(
  width: 100%,
  fill: surface,
  stroke: 0.5pt + border,
  radius: 5pt,
  inset: (x: 12pt, y: 10pt),
  {
    text(font: display-font, size: 20pt, weight: 700, fill: accent, value)
    linebreak()
    text(size: 6.8pt, tracking: 1pt, fill: muted, label)
  },
)

#let example-blocks(examples) = {
  for example in examples {
    let title = if example.summary != "" { example.summary } else {
      example.name
    }
    let lines = example.value-json.split("\n").len()
    let body = {
      grid(
        columns: (auto, 1fr),
        column-gutter: 7pt,
        align: (left, left),
        text(size: 7.7pt, weight: 600, fill: ink, title),
        if example.name != title {
          text(font: mono-font, size: 6.2pt, fill: faint, example.name)
        },
      )
      v(3pt)
      code-block(example.value-json)
    }
    if lines <= 16 {
      block(breakable: false, width: 100%, above: 7pt, below: 2pt, body)
    } else {
      block(width: 100%, above: 7pt, below: 2pt, body)
    }
  }
}

#let security-line(op) = {
  block(
    width: 100%,
    fill: surface,
    radius: 4pt,
    inset: (x: 9pt, y: 6pt),
    above: 8pt,
    {
      field-label("Security")
      h(8pt)
      if op.security.len() == 0 {
        text(size: 7.4pt, fill: muted, "No authentication")
      } else {
        for (index, requirement) in op.security.enumerate() {
          if index > 0 { text(fill: faint, "  ·  ") }
          if requirement.len() == 0 {
            text(size: 7.4pt, fill: muted, "No authentication")
          } else {
            for (scheme-index, scheme) in requirement.enumerate() {
              if scheme-index > 0 { text(fill: faint, " + ") }
              link(label("scheme-" + scheme), text(
                font: mono-font,
                size: 7.4pt,
                fill: accent,
                scheme,
              ))
            }
          }
        }
      }
      h(8pt)
      text(size: 6.6pt, fill: faint, if op.security-inherited {
        "(inherited)"
      } else { "" })
    },
  )
}

#let params-table(params) = {
  let cells = ()
  for parameter in params {
    cells.push(block({
      text(font: mono-font, size: 7.6pt, weight: 600, parameter.name)
      if parameter.deprecated {
        h(4pt)
        deprecated-badge
      }
    }))
    cells.push(block(spacing: 1.5pt, {
      schema-type(parameter.schema)
      compact-meta(
        parameter.schema,
        default-text: parameter.default-text,
        constraints: parameter.constraints,
      )
    }))
    cells.push(if parameter.required {
      text(size: 7.2pt, weight: 600, fill: rgb("#067647"), "Yes")
    } else {
      text(size: 7.2pt, fill: faint, "—")
    })
    cells.push(block(spacing: 1.5pt, {
      md-inline(parameter.description)
      if parameter.example-short != none {
        text(size: 6.7pt, fill: muted, "  ·  Example: ")
        text(font: mono-font, size: 6.7pt, fill: muted, parameter.example-short)
      }
    }))
  }
  table(
    columns: (1.35fr, 1.35fr, 0.42fr, 2.9fr),
    stroke: (x: none, y: 0.4pt + border),
    inset: (x: 6pt, y: 6pt),
    align: (left, left, center, left),
    table.header(
      repeat: true,
      table.cell(fill: surface)[#field-label("Name")],
      table.cell(fill: surface)[#field-label("Type")],
      table.cell(fill: surface, align: center)[#field-label("Required")],
      table.cell(fill: surface)[#field-label("Description")],
    ),
    ..cells,
  )
}

#let request-body-section(body) = {
  subsection(
    "Request body",
    trailing: if body.required {
      text(size: 7pt, weight: 600, fill: rgb("#B54708"), "Required")
    } else { text(size: 7pt, fill: faint, "Optional") },
  )
  if body.description != "" { md(body.description) }
  for content in body.content {
    let model = content.request-model
    block(breakable: false, {
      block(width: 100%, above: 6pt, {
        chip(
          content.media-type,
          fill: accent-soft,
          stroke: rgb("#D7DEFA"),
          ink-color: accent-ink,
        )
        h(8pt)
        if model != none and model.kind == "one-of" {
          text(size: 7.2pt, fill: muted, "Request variants: ")
          text(
            size: 7.2pt,
            fill: ink,
            str(model.variant-count) + " alternatives",
          )
        } else if model != none and model.name != "" {
          text(size: 7.2pt, fill: muted, "Full model: ")
          link(
            label("schema-" + model.name),
            text(font: mono-font, size: 7.4pt, fill: accent, model.name),
          )
        } else {
          text(size: 7.2pt, fill: muted, "Schema: ")
          schema-type(content.schema)
        }
      })
      if model != none {
        if model.kind == "one-of" {
          v(2pt)
          request-variants-table(model)
          text(
            size: 6.9pt,
            fill: faint,
            "Each variant is defined in full under Data Models; representative examples follow.",
          )
        } else if model.fields.len() > 0 {
          v(3pt)
          field-table(model.fields)
          if model.truncated {
            text(
              size: 6.8pt,
              fill: faint,
              "Showing "
                + str(model.fields.len())
                + " of "
                + str(model.field-count)
                + " fields; the full model is in Data Models.",
            )
          }
        }
      }
    })
    if content.examples-show.len() > 0 {
      example-blocks(content.examples-show)
      if content.examples-total > content.examples-show.len() {
        v(-2pt)
        text(
          size: 6.6pt,
          fill: faint,
          "Showing "
            + str(content.examples-show.len())
            + " of "
            + str(content.examples-total)
            + " examples from the specification.",
        )
      }
    }
  }
}

#let responses-section(spec, op) = {
  let specific = op.responses.filter(response => response.shared == none)
  let successes = op.shared-response-refs.filter(ref => (
    ref.group-kind == "success"
  ))
  let row-count = specific.len() + successes.len()
  let content = {
    subsection(
      "Responses",
      trailing: link(
        label("error-conventions"),
        text(size: 7pt, fill: accent, "Common errors ↗"),
      ),
    )
    if row-count > 0 {
      let cells = ()
      for response in specific {
        cells.push(status-badge(response.status, response.status-class))
        cells.push(block(spacing: 2pt, {
          md-inline(response.description)
          if response.status == "202" {
            h(5pt)
            chip(
              "asynchronous",
              fill: rgb("#E8F1FE"),
              stroke: rgb("#C7D7FE"),
              ink-color: rgb("#175CD3"),
            )
          } else if response.status == "204" {
            h(5pt)
            chip(
              "no body",
              fill: rgb("#F2F4F7"),
              stroke: rgb("#E4E7EC"),
              ink-color: rgb("#475467"),
            )
          }
        }))
        if response.content.len() == 0 {
          cells.push(text(size: 7.2pt, fill: faint, "—"))
        } else {
          cells.push(block(spacing: 1.5pt, {
            for (index, response-content) in response.content.enumerate() {
              if index > 0 { linebreak() }
              schema-type(response-content.schema)
            }
          }))
        }
      }
      for ref in successes {
        cells.push(status-badge(ref.status, ref.status-class))
        cells.push(block(spacing: 1.5pt, {
          text(size: 7.5pt, fill: ink, ref.label)
          if ref.status == "202" {
            h(5pt)
            chip(
              "asynchronous",
              fill: rgb("#E8F1FE"),
              stroke: rgb("#C7D7FE"),
              ink-color: rgb("#175CD3"),
            )
          }
          h(5pt)
          link(
            label("response-group-" + ref.group-id),
            text(size: 6.9pt, fill: accent, "envelope ↗"),
          )
        }))
        cells.push(link(
          label("response-group-" + ref.group-id),
          text(size: 7pt, fill: accent, "See envelope ↗"),
        ))
      }
      table(
        columns: (auto, 1fr, 2.15fr),
        stroke: (x: none, y: 0.4pt + border),
        inset: (x: 6pt, y: 6pt),
        align: (left, left, left),
        table.header(
          repeat: true,
          table.cell(fill: surface)[#field-label("Status")],
          table.cell(fill: surface)[#field-label("Description")],
          table.cell(fill: surface)[#field-label("Schema")],
        ),
        ..cells,
      )
    }
  }
  if row-count <= 6 {
    block(breakable: false, content)
  } else {
    content
  }

  for response in specific {
    if response.content.len() > 0 {
      let examples = ()
      let total = 0
      for response-content in response.content {
        total = total + response-content.examples-total
        for example in response-content.examples-show {
          examples.push(example)
        }
      }
      if examples.len() > 0 {
        let content = {
          status-badge(response.status, response.status-class)
          h(7pt)
          text(size: 7.4pt, fill: muted, [Response examples])
          example-blocks(examples)
          if total > examples.len() {
            v(-2pt)
            text(
              size: 6.6pt,
              fill: faint,
              "Showing "
                + str(examples.len())
                + " of "
                + str(total)
                + " examples from the specification.",
            )
          }
        }
        if examples.len() <= 2 {
          block(breakable: false, width: 100%, above: 10pt, content)
        } else {
          block(width: 100%, above: 10pt, content)
        }
      }
    }
    if response.headers.len() > 0 {
      block(width: 100%, above: 8pt, {
        text(size: 7.2pt, fill: muted, [Headers: ])
        for (index, header) in response.headers.enumerate() {
          if index > 0 { text(fill: faint, " · ") }
          text(font: mono-font, size: 7.2pt, header.name)
        }
      })
    }
  }

  for ref in successes {
    let group = spec.response-groups.find(item => item.id == ref.group-id)
    if group != none and group.examples.len() > 0 {
      block(width: 100%, above: 10pt, {
        status-badge(ref.status, ref.status-class)
        h(7pt)
        text(size: 7.4pt, fill: muted, ref.label)
        example-blocks(group.examples)
      })
    }
  }
}

#let requirement-display(requirements) = {
  if requirements.len() == 0 {
    text(size: 7.4pt, fill: muted, "No authentication")
  } else {
    for (index, requirement) in requirements.enumerate() {
      if index > 0 { text(fill: faint, "  ·  ") }
      if requirement.len() == 0 {
        text(size: 7.4pt, fill: muted, "No authentication")
      } else {
        for (scheme-index, scheme) in requirement.enumerate() {
          if scheme-index > 0 { text(fill: faint, " + ") }
          link(
            label("scheme-" + scheme),
            text(font: mono-font, size: 7.4pt, fill: accent, scheme),
          )
        }
      }
    }
  }
}

#let auth-exception-line(op) = block(
  width: 100%,
  fill: surface,
  stroke: 0.5pt + border,
  radius: 4pt,
  inset: (x: 10pt, y: 7pt),
  above: 8pt,
  {
    field-label("AUTHENTICATION")
    h(8pt)
    requirement-display(op.security)
    h(7pt)
    link(
      label("authentication"),
      text(size: 6.8pt, fill: accent, "Authentication guide ↗"),
    )
  },
)

#let endpoint(spec, op) = {
  running-endpoint.update(op.heading)
  let op-label = if op.operation-id != "" { op.operation-id } else {
    op.heading
  }
  block(breakable: false, {
    [#heading(level: 2, outlined: true)[#op.heading]#label(
        "operation-" + op-label,
      )]
    block(width: 100%, below: 6pt, {
      grid(
        columns: (auto, 1fr, auto),
        column-gutter: 9pt,
        align: (left, left, right),
        method-badge(op.method),
        text(font: mono-font, size: 9.4pt, fill: ink, path-display(op.path)),
        block({
          if op.deprecated { deprecated-badge }
        }),
      )
      v(4pt)
      line(length: 100%, stroke: 0.7pt + border)
    })
    if op.purpose != "" and op.purpose.len() < 500 { md(op.purpose) }
    block(above: 4pt, {
      text(size: 7.4pt, fill: muted, "Authentication: ")
      requirement-display(op.security)
      if spec.authentication.default != none and not op.security-exception {
        text(size: 6.8pt, fill: faint, " (default)")
      } else if op.security-exception {
        text(size: 6.8pt, fill: faint, " (non-default)")
      }
    })
  })
  if op.purpose.len() >= 500 { md(op.purpose) }
  let groups = (
    ("path", "Path parameters"),
    ("query", "Query parameters"),
    ("header", "Header parameters"),
    ("cookie", "Cookie parameters"),
  )
  for (location, title) in groups {
    let items = op.parameters.filter(parameter => (
      parameter.location == location
    ))
    if items.len() > 0 {
      if items.len() <= 8 {
        block(breakable: false, {
          subsection(title)
          params-table(items)
        })
      } else {
        subsection(title)
        params-table(items)
      }
    }
  }
  if op.request-body != none { request-body-section(op.request-body) }
  responses-section(spec, op)
  if op.notes-first != "" {
    block(breakable: false, {
      subsection("Notes & prerequisites")
      md(op.notes-first)
    })
    if op.notes-rest != "" { md(op.notes-rest) }
  }
  if op.external-docs != none {
    v(6pt)
    link(op.external-docs.url, text(
      size: 7.4pt,
      fill: accent,
      [External documentation ↗],
    ))
  }
  running-endpoint.update(none)
}

// ---------------------------------------------------------------- sections ---

#let overview(spec) = {
  heading(level: 1, outlined: true)[Overview]
  if spec.description != "" { md(spec.description) }
  v(8pt)
  grid(
    columns: (1fr, 1fr, 1fr, 1fr),
    gutter: 9pt,
    stat-card(str(spec.stats.operations), "ENDPOINTS"),
    stat-card(str(spec.stats.schemas), "SCHEMAS"),
    stat-card(str(spec.stats.tags), "TAGS"),
    stat-card(str(spec.servers.len()), "BASE URLS"),
  )

  subsection("Intended audience")
  md(
    "This reference is written for developers, QA engineers, architects and integration partners who build against the API.",
  )

  subsection("Base URLs")
  md(
    "Every endpoint path in this document is relative to one of the base URLs below.",
  )
  if spec.servers.len() == 0 {
    text(size: 8pt, fill: muted)[No servers are declared in this specification.]
  }
  for server in spec.servers {
    block(
      width: 100%,
      fill: surface,
      stroke: 0.5pt + border,
      radius: 4pt,
      inset: (x: 12pt, y: 9pt),
      above: 6pt,
      {
        text(font: mono-font, size: 8.6pt, weight: 600, fill: ink, server.url)
        if server.description != "" {
          linebreak()
          text(size: 7.5pt, fill: muted, server.description)
        }
        if server.variables.len() > 0 {
          v(4pt)
          field-label("VARIABLES")
          linebreak()
          for (index, variable) in server.variables.enumerate() {
            if index > 0 { linebreak() }
            text(
              font: mono-font,
              size: 7.2pt,
              fill: muted,
              variable.name + " = " + variable.default,
            )
            if variable.description != "" {
              h(6pt)
              text(size: 7pt, fill: faint, variable.description)
            }
          }
        }
      },
    )
  }

  if spec.tags.len() > 0 {
    subsection("API groups")
    grid(
      columns: (1fr, 1fr),
      gutter: 9pt,
      ..spec.tags.map(tag => block(
        width: 100%,
        fill: paper,
        stroke: 0.5pt + border,
        radius: 4pt,
        inset: (x: 11pt, y: 9pt),
        above: 5pt,
        link(label("tag-" + tag.name), {
          text(
            font: display-font,
            size: 9.6pt,
            weight: 700,
            fill: ink,
            tag.name,
          )
          h(1fr)
          text(
            font: mono-font,
            size: 7.4pt,
            fill: accent,
            str(tag.operation-count) + " →",
          )
          if tag.description != "" {
            linebreak()
            text(size: 7.3pt, fill: muted, tag.description)
          }
        }),
      )),
    )
  }

  subsection("Document details")
  let details = (
    ("VERSION", spec.version),
    ("OPENAPI", spec.openapi),
    ("GENERATED", spec.generated.date),
    (
      "PUBLISHER",
      if spec.contact != none and spec.contact.name != "" {
        spec.contact.name
      } else { "—" },
    ),
  )
  grid(
    columns: (1fr, 1fr, 1fr, 1fr),
    gutter: 9pt,
    ..details.map(pair => block(
      width: 100%,
      fill: surface,
      stroke: 0.5pt + border,
      radius: 4pt,
      inset: (x: 11pt, y: 8pt),
      {
        field-label(pair.at(0))
        linebreak()
        text(size: 8.4pt, fill: ink, pair.at(1))
      },
    )),
  )
}

#let environments(spec) = {
  heading(level: 1, outlined: true)[Environments & Base URLs]
  md(
    "Every endpoint path in this document is relative to one of the base URLs below.",
  )
  if spec.servers.len() == 0 {
    text(size: 8pt, fill: muted)[No servers are declared in this specification.]
  }
  for server in spec.servers {
    block(
      width: 100%,
      fill: surface,
      stroke: 0.5pt + border,
      radius: 4pt,
      inset: (x: 12pt, y: 9pt),
      above: 6pt,
      {
        text(font: mono-font, size: 8.6pt, weight: 600, fill: ink, server.url)
        if server.description != "" {
          linebreak()
          text(size: 7.5pt, fill: muted, server.description)
        }
        if server.variables.len() > 0 {
          v(4pt)
          field-label("VARIABLES")
          linebreak()
          for (index, variable) in server.variables.enumerate() {
            if index > 0 { linebreak() }
            text(
              font: mono-font,
              size: 7.2pt,
              fill: muted,
              variable.name + " = " + variable.default,
            )
            if variable.description != "" {
              h(6pt)
              text(size: 7pt, fill: faint, variable.description)
            }
          }
        }
      },
    )
  }
}

#let authentication-section(spec) = {
  [#heading(level: 1, outlined: true)[Authentication & Authorization]#label(
      "authentication",
    )]
  let auth = spec.authentication
  md(
    "Authentication is described once here. Endpoint sections only call out credentials that differ from the default.",
  )
  if auth.default != none {
    block(
      width: 100%,
      fill: surface,
      stroke: 0.5pt + border,
      radius: 4pt,
      inset: (x: 11pt, y: 8pt),
      above: 5pt,
      {
        field-label("DEFAULT REQUIREMENT")
        v(3pt)
        requirement-display(auth.default.requirements)
        h(8pt)
        text(
          size: 7pt,
          fill: faint,
          "Applies to "
            + str(auth.default.count)
            + " of "
            + str(auth.default.total)
            + " endpoints.",
        )
      },
    )
  } else {
    md(
      "Security requirements vary by endpoint; they are shown in each endpoint section.",
    )
  }

  if auth.schemes.len() > 0 {
    subsection("Security schemes")
    for scheme in auth.schemes {
      block(
        width: 100%,
        fill: paper,
        stroke: 0.5pt + border,
        radius: 4pt,
        inset: (x: 12pt, y: 9pt),
        above: 6pt,
        {
          [#text(
              font: display-font,
              size: 9.8pt,
              weight: 700,
              scheme.name,
            )#label("scheme-" + scheme.name)]
          h(7pt)
          chip(
            scheme.type
              + (if scheme.scheme != "" { " / " + scheme.scheme } else { "" }),
            fill: accent-soft,
            stroke: rgb("#D7DEFA"),
            ink-color: accent-ink,
          )
          if scheme.description != "" {
            v(4pt)
            md-inline(scheme.description)
          }
          if scheme.header-example != "" {
            v(6pt)
            field-label("HEADER FORMAT")
            v(2pt)
            block(
              width: 100%,
              fill: code-bg,
              stroke: 0.5pt + code-border,
              radius: 3pt,
              inset: (x: 8pt, y: 5pt),
              text(
                font: mono-font,
                size: 7.7pt,
                fill: ink,
                scheme.header-example,
              ),
            )
          }
          if scheme.scopes.len() > 0 {
            v(4pt)
            field-label("SCOPES")
            linebreak()
            for (index, scope) in scheme.scopes.enumerate() {
              if index > 0 { text(fill: faint, " · ") }
              text(font: mono-font, size: 7.2pt, fill: muted, scope)
            }
          }
        },
      )
    }
    let has-scopes = auth.schemes.any(scheme => scheme.scopes.len() > 0)
    if not has-scopes {
      v(4pt)
      text(
        size: 7.4pt,
        fill: muted,
      )[No OAuth 2.0 scopes or roles are declared in this specification.]
    }
  }

  if auth.default != none and auth.exceptions.len() > 0 {
    subsection("Endpoints with different authentication")
    let cells = ()
    for exception in auth.exceptions {
      let target = if exception.operation-id != "" {
        exception.operation-id
      } else {
        exception.heading
      }
      cells.push(link(
        label("operation-" + target),
        text(size: 7.6pt, fill: accent, exception.heading),
      ))
      cells.push(text(
        font: mono-font,
        size: 7pt,
        fill: muted,
        exception.method,
      ))
      cells.push(requirement-display(exception.security))
    }
    table(
      columns: (1.6fr, auto, 1.4fr),
      stroke: (x: none, y: 0.4pt + border),
      inset: (x: 6pt, y: 5.5pt),
      align: (left, left, left),
      table.header(
        repeat: true,
        table.cell(fill: surface)[#field-label("Endpoint")],
        table.cell(fill: surface)[#field-label("Method")],
        table.cell(fill: surface)[#field-label("Security")],
      ),
      ..cells,
    )
  }
}

#let request-conventions(spec) = {
  [#heading(level: 1, outlined: true)[Request Conventions]#label(
      "request-conventions",
    )]
  let conventions = spec.conventions
  subsection("Content types")
  if conventions.media-types.len() > 0 {
    for entry in conventions.media-types {
      chip(entry.media-type)
      h(5pt)
    }
    v(4pt)
    let media = conventions.media-types.map(entry => entry.media-type)
    if "application/json" in media and "multipart/form-data" in media {
      text(
        size: 8pt,
        fill: muted,
      )[JSON is the default representation for requests and responses; multipart/form-data is used for file uploads.]
    } else if "application/json" in media {
      text(size: 8pt, fill: muted)[Requests and responses use application/json.]
    } else {
      text(
        size: 8pt,
        fill: muted,
      )[The content types above are used by the documented operations.]
    }
  }

  if conventions.headers.len() > 0 {
    subsection("Headers")
    text(
      size: 8pt,
      fill: muted,
    )[The Authorization header carries credentials for authenticated requests; see Authentication & Authorization.]
  }

  if conventions.pagination.parameters.len() > 0 {
    subsection("Pagination")
    text(
      size: 8pt,
      fill: muted,
    )[Where pagination is supported, endpoints accept the parameters below and responses include pagination metadata.]
    params-table(conventions.pagination.parameters)
    if conventions.pagination.model-name != "" {
      v(3pt)
      text(size: 7.4pt, fill: muted)[Pagination metadata is defined by ]
      link(
        label("schema-" + conventions.pagination.model-name),
        text(
          font: mono-font,
          size: 7.4pt,
          fill: accent,
          conventions.pagination.model-name,
        ),
      )
      text(size: 7.4pt, fill: muted)[.]
    }
  }

  if (
    conventions.sorting.parameters.len() > 0
      or conventions.filtering.parameters.len() > 0
  ) {
    subsection("Sorting and filtering")
    text(
      size: 8pt,
      fill: muted,
    )[Where supported, sorting selects the field and direction; filter applies field-level expressions.]
    let combined = (
      conventions.sorting.parameters + conventions.filtering.parameters
    )
    params-table(combined)
  }

  if conventions.datetime-example != none {
    subsection("Date and time")
    text(
      size: 8pt,
      fill: muted,
    )[Date-time fields use ISO 8601 (RFC 3339) strings.]
    v(2pt)
    text(
      font: mono-font,
      size: 7.6pt,
      fill: ink,
      conventions.datetime-example,
    )
  }
}

#let status-class-of(code) = {
  if code.ends-with("XX") {
    lower(code.slice(0, 1)) + "xx"
  } else if code.len() == 3 {
    code.slice(0, 1) + "xx"
  } else {
    "default"
  }
}

#let response-conventions(spec) = {
  [#heading(level: 1, outlined: true)[Response & Error Conventions]#label(
      "error-conventions",
    )]
  md(
    "Common conventions apply to every endpoint unless stated otherwise. Endpoint sections list endpoint-specific responses and link here for the shared failure responses; error payloads are shown once.",
  )
  let err = spec.error-reference
  if err != none {
    subsection("Error model")
    if err.note != "" { md(err.note) }
    if err.envelope != none {
      [#heading(level: 3, outlined: false)[#err.envelope.name]#label(
          "schema-" + err.envelope.name,
        )]
      block(width: 100%, below: 4pt, {
        chip(
          err.envelope.type-label,
          fill: accent-soft,
          stroke: rgb("#D7DEFA"),
          ink-color: accent-ink,
        )
        if err.envelope.property-count > 0 {
          h(6pt)
          text(
            size: 6.8pt,
            fill: faint,
            str(err.envelope.property-count)
              + " properties · "
              + str(err.envelope.required-count)
              + " required",
          )
        }
      })
      if err.envelope.description != "" { md(err.envelope.description) }
      schema-body(err.envelope.node)
    }

    subsection("Status codes")
    text(
      size: 8pt,
      fill: muted,
    )[Status codes used across the API; entries such as 4XX and 5XX represent status-class ranges.]
    table(
      columns: (auto, 1fr),
      stroke: (x: none, y: 0.4pt + border),
      inset: (x: 6pt, y: 5pt),
      align: (left, left),
      table.header(
        repeat: true,
        table.cell(fill: surface)[#field-label("Status")],
        table.cell(fill: surface)[#field-label("Meaning")],
      ),
      ..err
        .statuses
        .map(item => (
          status-badge(item.code, status-class-of(item.code)),
          text(size: 7.8pt, item.meaning),
        ))
        .flatten(),
    )

    block(breakable: false, {
      subsection("Representative error examples")
      text(
        size: 8pt,
        fill: muted,
      )[Structurally similar examples are shown once, taken verbatim from the specification.]
    })
    example-blocks(err.examples)
    if err.examples-total > err.examples.len() {
      text(
        size: 6.8pt,
        fill: faint,
        "Showing "
          + str(err.examples.len())
          + " of "
          + str(err.examples-total)
          + " distinct error examples from the specification.",
      )
    }

    let others = err.models.filter(model => (
      err.envelope == none or model.name != err.envelope.name
    ))
    if others.len() > 0 {
      subsection("Additional error payloads")
      for model in others { schema-card(model) }
    }
  } else {
    md("No shared error model is declared in this specification.")
  }

  let success = spec.response-groups.filter(group => group.kind == "success")
  if success.len() > 0 {
    subsection("Success response envelopes")
    md(
      "These response shapes are reused by multiple endpoints; endpoint sections link to the relevant entry here.",
    )
    for group in success {
      block(breakable: false, {
        [#heading(level: 3, outlined: false)[#group.label]#label(
            "response-group-" + group.id,
          )]
        block(width: 100%, below: 4pt, {
          chip(
            "success envelope",
            fill: accent-soft,
            stroke: rgb("#D7DEFA"),
            ink-color: accent-ink,
          )
          if group.components.len() > 0 {
            h(6pt)
            for (index, component) in group.components.enumerate() {
              if index > 0 { text(fill: faint, " · ") }
              text(font: mono-font, size: 6.6pt, fill: faint, component)
            }
          }
        })
        if group.description != "" and group.description != group.label {
          md(group.description)
        }
        for (index, node) in group.schemas.enumerate() {
          if index > 0 { linebreak() }
          text(size: 7.4pt, fill: muted, [Schema: ])
          schema-type(node)
        }
        if group.examples.len() > 0 { example-blocks(group.examples) }
      })
      v(12pt, weak: true)
    }
  }
}

#let endpoint-summary(spec) = {
  heading(level: 1, outlined: true)[Endpoint Summary]
  md(
    "Every endpoint in this specification. The detailed reference follows, grouped by API tag.",
  )
  let cells = ()
  for operation in spec.operations {
    cells.push(method-badge(operation.method))
    cells.push(text(
      font: mono-font,
      size: 7.1pt,
      path-display(operation.path),
    ))
    let target = if operation.operation-id != "" {
      operation.operation-id
    } else {
      operation.heading
    }
    cells.push(block({
      link(
        label("operation-" + target),
        text(size: 8pt, fill: ink, operation.summary),
      )
      h(4pt)
      link(
        label("operation-" + target),
        text(size: 7pt, fill: accent, "↗"),
      )
      if operation.deprecated {
        h(5pt)
        deprecated-badge
      }
      if operation.security-exception {
        linebreak()
        text(size: 6.4pt, fill: faint, "non-default authentication")
      }
    }))
    cells.push(text(size: 7pt, fill: muted, operation.tag))
  }
  table(
    columns: (auto, 1.6fr, 1.6fr, 0.8fr),
    stroke: (x: none, y: 0.4pt + border),
    inset: (x: 5pt, y: 5pt),
    align: (left, left, left, left),
    table.header(
      repeat: true,
      table.cell(fill: surface)[#field-label("Method")],
      table.cell(fill: surface)[#field-label("Path")],
      table.cell(fill: surface)[#field-label("Purpose")],
      table.cell(fill: surface)[#field-label("Tag")],
    ),
    ..cells,
  )
}

#let tag-section(spec, tag) = {
  [#heading(level: 1, outlined: true)[#tag.name]#label("tag-" + tag.name)]
  block(width: 100%, below: 6pt, {
    text(size: 8.6pt, fill: muted, tag.description)
    h(8pt)
    chip(
      (
        if tag.operation-count == 1 { "1 endpoint" } else {
          str(tag.operation-count) + " endpoints"
        }
      ),
      fill: accent-soft,
      stroke: rgb("#D7DEFA"),
      ink-color: accent-ink,
    )
  })
  let operations = spec.operations.filter(operation => (
    operation.tag == tag.name
  ))
  for (index, operation) in operations.enumerate() {
    if index > 0 { v(14pt, weak: true) }
    endpoint(spec, operation)
  }
}

#let data-models-section(spec) = {
  heading(level: 1, outlined: true)[Data Models]
  md(
    "Reusable request and response models are defined once here. Endpoint sections link to these definitions instead of repeating fields. Error payload models are documented with the error conventions.",
  )
  if spec.config.mode == "exhaustive" {
    for schema in spec.data-models { schema-card(schema) }
    return
  }
  let models = spec.data-models
  let primary = models.filter(schema => schema.role == "primary")
  let versioned = models.filter(schema => schema.role == "versioned")
  let envelopes = models.filter(schema => schema.role == "envelope")
  let small = models.filter(schema => schema.role == "small")
  let helpers = models.filter(schema => schema.role == "helper")

  if primary.len() > 0 {
    subsection("Primary models")
    text(
      size: 7.8pt,
      fill: muted,
    )[Request and response models developers are most likely to inspect directly.]
    for schema in primary { schema-card(schema) }
  }
  if versioned.len() > 0 {
    subsection("Versioned models")
    text(
      size: 7.8pt,
      fill: muted,
    )[Only differences from the base model are shown; unchanged fields remain documented once.]
    for schema in versioned { versioned-card(schema) }
  }
  if envelopes.len() > 0 {
    subsection("Response envelopes")
    text(
      size: 7.8pt,
      fill: muted,
    )[Simple wrappers around a result object or status code.]
    for schema in envelopes { wrapper-card(schema) }
  }
  if small.len() > 0 {
    subsection("Small reusable models")
    for schema in small { schema-card(schema, compact: true) }
  }
  if helpers.len() > 0 {
    subsection("Helper models")
    text(
      size: 7.8pt,
      fill: muted,
    )[Referenced by other models; grouped here rather than given equal weight to public models.]
    for schema in helpers { schema-card(schema, compact: true) }
  }
}

#let enum-section(spec) = {
  if spec.enum-reference.len() == 0 { return }
  heading(level: 1, outlined: true)[Enumerations]
  md("Allowed values for enumerated fields and request parameters.")
  let cells = ()
  for entry in spec.enum-reference {
    cells.push(text(font: mono-font, size: 7.4pt, weight: 600, entry.name))
    cells.push(block({
      for (index, value) in entry.values.enumerate() {
        if index > 0 { text(fill: faint, "  ·  ") }
        text(font: mono-font, size: 7pt, value)
      }
    }))
    cells.push(block({
      for (index, source) in entry.used-in.enumerate() {
        if index < 4 {
          if index > 0 { text(fill: faint, "  ·  ") }
          text(size: 7pt, fill: muted, source)
        }
      }
      if entry.used-in.len() > 4 {
        text(
          size: 6.6pt,
          fill: faint,
          "  +" + str(entry.used-in.len() - 4) + " more",
        )
      }
    }))
  }
  table(
    columns: (1.2fr, 2.2fr, 2.2fr),
    stroke: (x: none, y: 0.4pt + border),
    inset: (x: 6pt, y: 5pt),
    align: (left, left, left),
    table.header(
      repeat: true,
      table.cell(fill: surface)[#field-label("Name")],
      table.cell(fill: surface)[#field-label("Allowed values")],
      table.cell(fill: surface)[#field-label("Used in")],
    ),
    ..cells,
  )
}

#let specification-notes-section(spec) = {
  if spec.specification-notes.len() == 0 { return }
  heading(level: 1, outlined: true)[Specification Notes]
  md(
    "The following observations come from inconsistencies or conventions in the source specification.",
  )
  for note in spec.specification-notes {
    block(above: 3pt, {
      text(fill: accent, "•")
      h(6pt)
      text(size: 8.4pt, note)
    })
  }
}


// ------------------------------------------------------------------ pages ---

#let field-label-on-dark(text-body) = text(
  size: 6.2pt,
  weight: 700,
  tracking: 1.2pt,
  fill: rgb("#8FA6FF"),
  text-body,
)

#let cover(spec) = {
  page(
    margin: 0pt,
    header: none,
    footer: none,
    numbering: none,
    {
      place(top + left, rect(width: 100%, height: 100%, fill: rgb("#0A1224")))
      place(
        top + right,
        rect(width: 41%, height: 100%, fill: gradient.linear(
          rgb("#0E1A3D"),
          rgb("#1D2C6E"),
          angle: 180deg,
        )),
      )
      place(top + right, dx: -1.2cm, dy: 5.2cm, circle(
        radius: 5.6cm,
        stroke: 0.7pt + rgb("#FFFFFF22"),
      ))
      place(top + right, dx: 0.4cm, dy: 9.4cm, circle(
        radius: 7.4cm,
        stroke: 0.6pt + rgb("#FFFFFF10"),
      ))
      place(top + right, dx: -3.2cm, dy: 13.6cm, circle(
        radius: 1.1cm,
        fill: rgb("#63E6D31A"),
      ))
      place(top + right, dx: -5.6cm, dy: 16.4cm, circle(
        radius: 0.45cm,
        fill: rgb("#8FA6FF33"),
      ))

      place(top + left, dx: 2.5cm, dy: 2.4cm, block(width: 11.8cm, {
        text(
          size: 7.6pt,
          weight: 700,
          tracking: 3.4pt,
          fill: rgb("#8FA6FF"),
        )[API REFERENCE]
        v(2.1cm)
        block({
          set par(leading: 1.06em)
          text(
            font: display-font,
            size: 34pt,
            weight: 700,
            fill: white,
            spec.title,
          )
        })
        v(0.75cm)
        line(length: 2.6cm, stroke: 2.4pt + rgb("#63E6D3"))
        v(0.7cm)
        block({
          set par(leading: 1.55em)
          text(size: 10.6pt, fill: rgb("#C3CDE6"), spec.description)
        })
      }))

      place(bottom + right, dx: -2.5cm, dy: -2.4cm, block(width: 7.4cm, {
        align(right, {
          text(
            font: display-font,
            size: 46pt,
            weight: 700,
            fill: rgb("#FFFFFF14"),
            spec.version,
          )
          v(-6pt)
          line(length: 100%, stroke: 0.5pt + rgb("#FFFFFF2A"))
          v(6pt)
          text(
            size: 7pt,
            tracking: 1.6pt,
            fill: rgb("#8FA6FF"),
            [OPENAPI ] + spec.openapi,
          )
          linebreak()
          text(
            size: 7pt,
            tracking: 1.6pt,
            fill: rgb("#8FA6FF"),
            str(spec.stats.operations)
              + " ENDPOINTS · "
              + str(spec.stats.schemas)
              + " SCHEMAS",
          )
        })
      }))

      place(bottom + left, dx: 2.5cm, dy: -2.5cm, block(width: 12.2cm, {
        line(length: 100%, stroke: 0.5pt + rgb("#FFFFFF26"))
        v(9pt)
        if spec.servers.len() > 0 {
          field-label-on-dark("SERVER")
          linebreak()
          text(
            font: mono-font,
            size: 8pt,
            fill: rgb("#E7ECF8"),
            spec.servers.at(0).url,
          )
        }
        v(8pt)
        if spec.contact != none {
          field-label-on-dark("CONTACT")
          linebreak()
          text(
            size: 7.8pt,
            fill: rgb("#C3CDE6"),
            spec.contact.name
              + (
                if spec.contact.email != "" {
                  " · " + spec.contact.email
                } else { "" }
              ),
          )
        }
        v(10pt)
        text(size: 6.6pt, fill: rgb("#7986A8"))[
          Generated #spec.generated.date · OpenAPI #spec.openapi · #spec.generated.tool
        ]
      }))
    },
  )
}

#let toc-page(spec) = {
  page(
    margin: (x: 2.4cm, top: 2.4cm, bottom: 2.4cm),
    header: none,
    footer: none,
    numbering: none,
    {
      text(font: display-font, size: 25pt, weight: 700, fill: ink, "Contents")
      v(4pt)
      text(size: 8.4pt, fill: muted, spec.title + " · version " + spec.version)
      v(22pt)
      set text(size: 9.1pt)
      set outline.entry(fill: repeat[·])
      outline(title: none, depth: 2, indent: 0.9em)
    },
  )
}

// --------------------------------------------------------------- document ---

#let api-document(spec) = {
  set document(
    title: spec.title + " " + spec.version,
    author: if spec.contact != none and spec.contact.name != "" {
      spec.contact.name
    } else { "API documentation" },
    keywords: ("OpenAPI", "API reference", spec.title),
  )
  set page(
    paper: "a4",
    margin: (x: 2.15cm, top: 2.35cm, bottom: 2.15cm),
    header: context {
      set text(size: 6.8pt, fill: faint)
      grid(
        columns: (1fr, auto),
        align: (left, right),
        text(spec.title),
        if running-endpoint.get() != none {
          text(running-endpoint.get() + " · continued")
        } else {
          text(spec.version)
        },
      )
      v(-5pt)
      line(length: 100%, stroke: 0.5pt + border)
    },
    footer: context {
      set text(size: 6.8pt, fill: faint)
      grid(
        columns: (1fr, auto),
        align: (left, right),
        text(
          "OpenAPI " + spec.openapi + "  ·  generated " + spec.generated.date,
        ),
        [Page #counter(page).display() / #counter(page).final().first()],
      )
    },
  )
  set text(
    font: (body-font, "Noto Sans"),
    size: 9.4pt,
    fill: ink,
    lang: "en",
    hyphenate: true,
  )
  set par(leading: 0.68em, spacing: 1.05em, justify: false)
  set list(indent: 1em, marker: text(fill: accent, "•"))
  set enum(indent: 1em)
  show link: it => text(fill: accent, it)
  show raw: set text(font: mono-font)
  show raw.where(block: true): block.with(
    width: 100%,
    fill: code-bg,
    stroke: 0.5pt + code-border,
    radius: 4pt,
    inset: (x: 9pt, y: 8pt),
    above: 0.55em,
    below: 0.55em,
  )
  show raw.where(block: false): set text(size: 0.87em, fill: rgb("#344054"))
  show table: set text(size: 8.25pt, hyphenate: false)
  show heading: it => {
    if it.level == 1 {
      pagebreak(weak: true)
      v(0.1em)
      rect(width: 24pt, height: 2.6pt, fill: accent)
      v(0.32cm)
      text(font: display-font, size: 21pt, weight: 700, fill: ink, it.body)
      v(0.28cm)
      line(length: 100%, stroke: 0.7pt + border)
      v(0.55em)
    } else if it.level == 2 {
      v(1.15em, weak: true)
      text(font: display-font, size: 14.2pt, weight: 700, fill: ink, it.body)
      v(0.25em)
    } else {
      v(1.2em, weak: true)
      text(font: mono-font, size: 9.4pt, weight: 600, fill: ink, it.body)
      v(0.2em)
    }
  }

  cover(spec)
  toc-page(spec)
  counter(page).update(1)
  overview(spec)
  authentication-section(spec)
  request-conventions(spec)
  response-conventions(spec)
  endpoint-summary(spec)
  for tag in spec.tags {
    tag-section(spec, tag)
  }
  data-models-section(spec)
  enum-section(spec)
  specification-notes-section(spec)
}
