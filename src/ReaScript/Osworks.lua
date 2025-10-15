-- @description Open the project specified by argument
-- @name Osworks Tools
-- This script opens a project via OSC with a string argument (project path)

--[[
This script provides Web Surface functionality that extends REAPER's out-of-the-box capabilities, by a combination of OSC messages and external states.

The process is a 2 step operation:

1. The desired operation is prepared by providing arguments via "SetExtState" calls,

2. and then executed by sending an OSC message to REAPER with the operation ID as argument.

Example:
From your web surface client, send a GET http message with: `SET/EXTSTATE/osworks/project_path/${encodeURIComponent( projectPath )}`

Followed by an OSC message with the operationId: `OSC/osworks/1`


Requirements:

- Map this script to a osc address via the action list

In the example above we asume that the osc address is: osworks

Available operations:

1) Open project (operationId = 1)
  Opens the project specified by `project_path`
  argument: project_path
  type: string
]]
reaper.ClearConsole()

-- Helper functions

local function log(...)
    local concatenated = ""
    for _, s in ipairs({...}) do
        if s ~= nil then
            concatenated = concatenated .. s .. "\n"
        end
    end
    reaper.ShowConsoleMsg(concatenated)
end

local function normalizePath(path)
    if reaper.GetOS():match("Win") then
        return path:gsub("/", "\\")
    else
        return path:gsub("\\", "/")
    end
end

local function getOSCArgument()
    local is_new, name, sec, cmd, rel, res, val, ctx = reaper.get_action_context()

    if ctx == nil or ctx == "" then
        return nil
    end

    -- Extract the message
    local address = ctx:match("^osc:/([^:[]+)")

    if address == nil then
        return nil
    end

    -- Extract float or string value
    local value_type, value = ctx:match(":([fs])=([^%]]+)")

    if value_type == "f" then
        return nil -- Ignore float values because we expect an action identifier
    elseif value_type == "s" then
        local actionId, arguments = value:match("([%w_-]+)|([^%]]+)")
        return {actionId = actionId, arguments = arguments}
    end

    return nil
end

--------------------------------------------------------------------------
--------      Meat and potatoes    ---------------------------------------
--------------------------------------------------------------------------

local app = {
    name = "Osworks Tools",
    namespace = "osworks",
    supportedActions = {
        {
            id = "open_project",
            description = "Open the project specified by argument",
            handle = function(projectPath)
                if projectPath then
                reaper.Main_openProject("noprompt:" .. projectPath)
                end
            end
        }
    }
}

app.clearArgument = function(key)
    return reaper.DeleteExtState(app.namespace, key, true)
end

app.getArgument = function(key)
    local arg = reaper.GetExtState(app.namespace, key)
    app.clearArgument(key)
    return arg
end

app.run = function()
    local context = getOSCArgument()

    if context == nil then
        return {operation = nil, argument = nil}
    end

    local actionId = context.actionId
    local arguments = context.arguments or ""

    if actionId == nil then
        return {operation = nil, argument = nil}
    end

    -- loop through supportedActions and match actionId
    for _, act in pairs(app.supportedActions) do
        if act.id == actionId then
            act.handle(arguments)
            break
        end
    end
end

local function init()
    app.run()
end

init()
