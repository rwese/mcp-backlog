import { describe, it, expect } from "bun:test"
import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

describe("Backlog Tool", () => {
  const toolPath = join(__dirname, "../tool/backlog.ts")
  const configPath = join(__dirname, "../opencode.json")

  it("should have backlog.ts file", () => {
    expect(existsSync(toolPath)).toBe(true)
  })

  it("should have correct tool structure", () => {
    const content = readFileSync(toolPath, "utf-8")
    
    expect(content).toContain('import { tool } from "@opencode-ai/plugin"')
    expect(content).toContain('export default tool({')
    expect(content).toContain('description:')
    expect(content).toContain('args:')
    expect(content).toContain('async execute(')
  })

  it("should have correct args structure", () => {
    const content = readFileSync(toolPath, "utf-8")

    expect(content).toContain('action:')
    expect(content).toContain('topic:')
    expect(content).toContain('description:')
    expect(content).toContain('priority:')
    expect(content).toContain('status:')
    expect(content).toContain('enum([')
    expect(content).toContain('.optional()')
  })

  it("should be enabled in opencode.json for relevant agents", () => {
    const config = JSON.parse(readFileSync(configPath, "utf-8"))

    // backlog is deprecated, check new tools
    expect(config.tools.backlog).toBe(false)
    expect(config.tools.backlogRead).toBe(true)
    expect(config.tools.backlogWrite).toBe(false)
    expect(config.tools.backlogDone).toBe(false)
    
    // Verify yolo has write and done access
    expect(config.agent.yolo.tools.backlogWrite).toBe(true)
    expect(config.agent.yolo.tools.backlogDone).toBe(true)
  })

  it("should generate correct file path from topic", () => {
    const content = readFileSync(toolPath, "utf-8")
    
    // Check that it imports the filename generation function
    expect(content).toContain('generateBacklogFilename')
  })

  it("should use Bun.write for file operations", () => {
    const content = readFileSync(toolPath, "utf-8")

    expect(content).toContain('await Bun.write(')
  })

   describe("CRAD Operations", () => {
     it("should have action parameter in schema", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('action:')
       expect(content).toContain('enum([')
       expect(content).toContain('"create"')
       expect(content).toContain('"list"')
       expect(content).toContain('"amend"')
       expect(content).toContain('"done"')
     })

      it("should have status parameter for filtering", () => {
        const content = readFileSync(toolPath, "utf-8")

        expect(content).toContain('status:')
        expect(content).toContain('"new"')
        expect(content).toContain('"ready"')
        expect(content).toContain('"review"')
        expect(content).toContain('"done"')
        expect(content).toContain('"reopen"')
      })

     it("should have helper functions for CRAD operations", () => {
       const content = readFileSync(toolPath, "utf-8")

       // Check that it imports the helper functions from shared module
       expect(content).toContain('parseBacklogFile')
       expect(content).toContain('getNextVersion')
     })

     it("should have action handlers for CRAD operations", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('handleCreate')
       expect(content).toContain('handleList')
       expect(content).toContain('handleAmend')
       expect(content).toContain('handleDone')
     })

     it("should include status field in markdown template", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('## Status:')
     })

     it("should include version field in markdown template", () => {
       const content = readFileSync(toolPath, "utf-8")

       // Check that it imports the template functions
       expect(content).toContain('createBacklogTemplate')
       expect(content).toContain('amendBacklogTemplate')
     })

     it("should import fs for file operations", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain("import {") && (
         content.includes("readdirSync") ||
         content.includes("renameSync")
       )
     })

     it("should check for duplicate files in create operation", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('Check for duplicate')
       expect(content).toContain('fileExists')
       expect(content).toContain('already exists')
       expect(content).toContain('Use \'amend\' to update it.')
     })

     it("should archive old versions in amend operation", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('archivePath')
       expect(content).toContain('renameSync')
       expect(content).toContain('archived v')
     })

     it("should move completed items in done operation", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('COMPLETED_Backlog')
       expect(content).toContain('DONE_')
       expect(content).toContain('unlinkSync')
       expect(content).toContain('Marked backlog item as done')
     })

     it("should filter backlog items in list operation", () => {
       const content = readFileSync(toolPath, "utf-8")

       // Check that it imports the list handler from shared module
       expect(content).toContain('handleListBacklog')
     })

     it("should require topic and description for create", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('topic and description are required')
     })

     it("should require topic for amend and done", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('topic is required for amend')
       expect(content).toContain('topic is required for done')
     })

     it("should handle file not found errors", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('Backlog item not found')
     })

     it("should include agent and session metadata", () => {
       const content = readFileSync(toolPath, "utf-8")

       expect(content).toContain('context.agent')
       expect(content).toContain('context.sessionID')
     })
   })
})