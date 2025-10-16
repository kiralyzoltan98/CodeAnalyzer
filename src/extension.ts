// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode"
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    DocumentSymbol,
    SymbolKind,
} from "vscode-languageclient/node"

let client: LanguageClient
let outputChannel: vscode.OutputChannel

export function activate(context: vscode.ExtensionContext) {
    // Create output channel
    outputChannel = vscode.window.createOutputChannel("Code Analyzer")

    const command = vscode.workspace.getConfiguration("codeanalyzer.clangd").get<string>("path") || "clangd"

    const serverOptions: ServerOptions = {
        command,
        args: [
            // Basic settings
            "--header-insertion=never",
            "--clang-tidy=0",
            "--completion-style=detailed",
            "--function-arg-placeholders=0",
            "--all-scopes-completion",
            "--background-index",
            "--log=verbose",
            "--query-driver=**/*",
            "--enable-config",

            // Instead of using --folding-ranges, we'll use the compile commands file
            // The compile_commands.json file will handle the compiler flags
        ],
    }

    // Configure client options to disable default features
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: "file", language: "cpp" }],
        synchronize: {
            configurationSection: "codeanalyzer",
        },
        middleware: {
            // Disable hover
            provideHover: () => undefined,
            // Disable code completion
            provideCompletionItem: () => undefined,
            // Disable signature help
            provideSignatureHelp: () => undefined,
        },
    }

    client = new LanguageClient("codeanalyzer", "Code Analyzer", serverOptions, clientOptions)

    // Register command to analyze functions
    let disposable = vscode.commands.registerCommand("codeanalyzer.analyzeFunctions", async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.languageId !== "cpp") {
            vscode.window.showInformationMessage("Please open a C++ file first")
            return
        }

        try {
            // Request document symbols from the language server
            const symbols = await client.sendRequest("textDocument/documentSymbol", {
                textDocument: { uri: editor.document.uri.toString() },
            })

            outputChannel.clear()
            outputChannel.appendLine("Function Definitions Found:")
            outputChannel.appendLine("========================")

            // Filter and display only function symbols
            const functions = Array.isArray(symbols)
                ? symbols.filter(
                      (symbol: any) => symbol.kind === SymbolKind.Function || symbol.kind === SymbolKind.Method
                  )
                : []

            if (functions.length === 0) {
                outputChannel.appendLine("No functions found in this file.")
            } else {
                functions.forEach((func: any) => {
                    // Log all properties of the symbol for debugging
                    outputChannel.appendLine(`Function: ${func.name}`)
                    outputChannel.appendLine(`Detail: ${func.detail || "none"}`)
                    outputChannel.appendLine(`Type: ${func.type || "none"}`)
                    outputChannel.appendLine(`Documentation: ${func.documentation || "none"}`)
                    // If the symbol has children (which might contain parameter info)
                    if (func.children) {
                        outputChannel.appendLine("Parameters:")
                        func.children.forEach((child: any) => {
                            outputChannel.appendLine(
                                `  - ${child.name}: ${child.detail || child.type || "unknown type"}`
                            )
                        })
                    }
                    outputChannel.appendLine("------------------------")
                })
            }

            outputChannel.show()
        } catch (error) {
            console.error(error)
            vscode.window.showErrorMessage("Error analyzing functions: " + error)
        }
    })

    context.subscriptions.push(disposable)

    // Start the client
    client.start()
}

// This method is called when your extension is deactivated
export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined
    }
    return client.stop()
}
