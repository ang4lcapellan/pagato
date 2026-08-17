using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PagaTo.Infrastructure;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<PagaToDbContext>
{
    public PagaToDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? throw new InvalidOperationException(
                "Set ConnectionStrings__DefaultConnection before running Entity Framework design-time commands.");
        var options = new DbContextOptionsBuilder<PagaToDbContext>()
            .UseNpgsql(connectionString,
                npgsql => npgsql.MigrationsHistoryTable("__ef_migrations_history", "pagato"))
            .Options;
        return new PagaToDbContext(options);
    }
}
