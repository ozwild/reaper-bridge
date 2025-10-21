-- @description Open the project specified by argument
-- @name ReaperBridge: Open Project via OSC
-- @author Ozwild
-- @version 1.0
-- This script opens a project via OSC with a string argument (project path)

--[[
This script provides Web Surface functionality that extends REAPER's out-of-the-box capabilities.

To use this script, you need to send an OSC message from your web surface client with the operationId and argument specified below.

Example:

`OSC/reaper_bridge:sopen_project|C:/Path/To/Project.rpp`

Where:
`reaper_bridge` is the osc address,  
`open_project` is the operationId, 
s is the argument type (string) and 
`C:/Path/To/Project.rpp` is the argument (project path)


Requirements:

- Map this script to a osc address via the action list

In the example above we asume that the osc address has been mapped to `osc:/reaper_bridge`

]]
reaper.ClearConsole()

-- Helper functions

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

-- Application definition

local app = {
    name = "ReaperBridge",
    namespace = "reaper_bridge",
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
