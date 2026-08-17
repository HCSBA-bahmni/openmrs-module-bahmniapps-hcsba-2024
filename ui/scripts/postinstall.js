const fs = require("fs");
const path = require("path");

function log() {
    console.log("[postinstall]", ...arguments);
}

function remove(destination) {
    try {
        const stat = fs.lstatSync(destination);
        if (stat.isDirectory() && !stat.isSymbolicLink()) {
            fs.readdirSync(destination).forEach((entry) => {
                remove(path.join(destination, entry));
            });
            fs.rmdirSync(destination);
        } else {
            fs.unlinkSync(destination);
        }
        log("removed", destination);
    } catch (error) {
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
}

function copyTree(source, destination) {
    const stat = fs.statSync(source);
    if (stat.isDirectory()) {
        fs.mkdirSync(destination, { recursive: true });
        fs.readdirSync(source).forEach((entry) => {
            copyTree(path.join(source, entry), path.join(destination, entry));
        });
        return;
    }
    fs.copyFileSync(source, destination);
}

function linkComponents() {
    const target = path.resolve("node_modules", "@bower_components");
    const link = path.resolve("app", "components");
    if (!fs.existsSync(target)) {
        log("missing", target);
        return;
    }
    remove(link);
    fs.symlinkSync(target, link, "junction");
    log("symlink ok", link, "->", target);
}

function copyToBower(name) {
    const source = path.resolve("node_modules", name);
    const destination = path.resolve("node_modules", "@bower_components", name);
    if (!fs.existsSync(source)) {
        log("pkg missing", name);
        return;
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (fs.existsSync(destination)) {
        log("exists", destination);
        return;
    }
    copyTree(source, destination);
    log("copied", name, "to @bower_components");
}

linkComponents();
copyToBower("primeflex");
copyToBower("primeicons");
