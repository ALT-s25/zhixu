import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class StudentApp {
    record Student(String id, String name, int age) {}
    static final Path FILE = Path.of("students.tsv");
    static final Map<String, Student> data = new LinkedHashMap<>();

    static String field(String value) {
        if (value.isBlank() || value.contains("\t") || value.contains("\n")
                || value.contains("\r")) {
            throw new IllegalArgumentException("字段不能为空或含制表符、换行");
        }
        return value;
    }
    static Student parse(String id, String name, String ageText) {
        int age = Integer.parseInt(ageText);
        if (age < 0 || age > 150) throw new IllegalArgumentException("年龄范围0—150");
        return new Student(field(id), field(name), age);
    }
    static void load() throws IOException {
        if (!Files.exists(FILE)) return;
        int lineNumber = 0;
        for (String line : Files.readAllLines(FILE, StandardCharsets.UTF_8)) {
            lineNumber++;
            try {
                String[] fields = line.split("\t", -1);
                if (fields.length != 3) throw new IllegalArgumentException("列数错误");
                Student s = parse(fields[0], fields[1], fields[2]);
                if (data.putIfAbsent(s.id(), s) != null)
                    throw new IllegalArgumentException("学号重复");
            } catch (IllegalArgumentException ex) {
                throw new IOException("数据文件第" + lineNumber + "行损坏", ex);
            }
        }
    }
    static void save() throws IOException {
        Path temp = Files.createTempFile(FILE.toAbsolutePath().getParent(), "students-", ".tmp");
        try {
            List<String> lines = new ArrayList<>();
            for (Student s : data.values())
                lines.add(s.id() + "\t" + s.name() + "\t" + s.age());
            Files.write(temp, lines, StandardCharsets.UTF_8);
            try {
                Files.move(temp, FILE, StandardCopyOption.REPLACE_EXISTING,
                        StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException ex) {
                Files.move(temp, FILE, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temp);
        }
    }
    public static void main(String[] args) {
        try {
            load();
            if (args.length == 1 && args[0].equals("list")) {
                data.values().forEach(System.out::println);
                return;
            }
            if (args.length == 4 && (args[0].equals("add") || args[0].equals("update"))) {
                Student s = parse(args[1], args[2], args[3]);
                boolean exists = data.containsKey(s.id());
                if (args[0].equals("add") && exists)
                    throw new IllegalArgumentException("学号已存在");
                if (args[0].equals("update") && !exists)
                    throw new IllegalArgumentException("学号不存在");
                data.put(s.id(), s);
            } else if (args.length == 2 && args[0].equals("delete")) {
                if (data.remove(args[1]) == null)
                    throw new IllegalArgumentException("学号不存在");
            } else {
                throw new IllegalArgumentException("用法：list / add 学号 姓名 年龄 / update 学号 姓名 年龄 / delete 学号");
            }
            save();
            System.out.println("保存成功：" + FILE.toAbsolutePath());
        } catch (IOException | IllegalArgumentException ex) {
            System.err.println(ex.getMessage());
            if (ex.getCause() != null) System.err.println("原因：" + ex.getCause().getMessage());
            System.exit(1);
        }
    }
}