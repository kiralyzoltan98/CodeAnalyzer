// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "codeanalyzer" is now active!')

    const outputChannel = vscode.window.createOutputChannel("C Code Analyzer")

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand("codeanalyzer.helloWorld", () => {
        // The code you place here will be executed every time your command is executed
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            vscode.window.showInformationMessage("No active editor found.")
            return
        }

        if (editor.document.languageId !== "c") {
            vscode.window.showInformationMessage("This command is only available for C files.")
            return
        }

        const text = editor.document.getText()
        const functionDefinitions = new Map<string, string[]>()
        const functionCalls: string[] = []

        // Regex for simple C function definitions with parameters
        const funcDefRegex = /\b\w+\s+(\w+)\s*\(([^)]*)\)\s*\{/g
        let match
        while ((match = funcDefRegex.exec(text)) !== null) {
            const functionName = match[1]
            const params = match[2]
            const paramTypes = params
                .split(",")
                .map(p => {
                    p = p.trim()
                    if (p === "void" || p === "") {
                        return "void"
                    }
                    const lastSpaceIndex = p.lastIndexOf(" ")
                    // Handle cases like "int*", "char*", etc. where there's no space
                    if (lastSpaceIndex === -1) {
                        // It might be just a type like 'int' or a variable name without a type
                        // This logic assumes simple cases. For 'myVar', this will be 'myVar'
                        return p
                    }
                    return p.substring(0, lastSpaceIndex).trim()
                })
                .filter(p => p.length > 0)

            functionDefinitions.set(functionName, paramTypes)
        }

        // Regex for simple C function calls with arguments
        const funcCallRegex = /\b(\w+)\s*\(([^)]*)\);/g
        const cKeywords = new Set(["if", "for", "while", "switch", "sizeof"])
        while ((match = funcCallRegex.exec(text)) !== null) {
            const functionName = match[1]
            if (!cKeywords.has(functionName) && functionDefinitions.has(functionName)) {
                const args = match[2]
                    .split(",")
                    .map(a => a.trim())
                    .filter(a => a.length > 0)
                functionCalls.push(`${functionName}(${args.join(", ")})`)
            }
        }

        outputChannel.clear()
        outputChannel.appendLine("--- C Code Analysis ---")
        outputChannel.appendLine("")

        outputChannel.appendLine("Function Definitions:")
        if (functionDefinitions.size > 0) {
            for (const [name, params] of functionDefinitions) {
                outputChannel.appendLine(`- ${name}(${params.join(", ")})`)
            }
        } else {
            outputChannel.appendLine("- None")
        }

        outputChannel.appendLine("")
        outputChannel.appendLine("Function Calls to Defined Functions:")
        if (functionCalls.length > 0) {
            const uniqueCalls = [...new Set(functionCalls)]
            uniqueCalls.forEach(call => {
                outputChannel.appendLine(`- ${call}`)
            })
        } else {
            outputChannel.appendLine("- None")
        }

        outputChannel.show()
    })

    context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate() {}
