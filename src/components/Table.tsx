import { Table, Button, ScrollArea } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons";
import { Clip } from "../utils/twitch";

interface TableReviewsProps {
  data: Clip[];
}

export function StyledTable({ data }: TableReviewsProps) {
  const rows = data.map((row) => {
    return (
      <tr key={row.id}>
        <td>{row.id}</td>
        <td>{row.channelName}</td>
        <td>
          <Button
            component="a"
            href={row.edit_url}
            target="_blank"
            leftIcon={<IconExternalLink size={14} />}
          >
            Edit
          </Button>
        </td>
      </tr>
    );
  });

  return (
    <ScrollArea>
      <Table style={{ minWidth: 532 }} verticalSpacing="xs">
        <thead>
          <tr>
            <th>ID</th>
            <th>Channel Name</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </Table>
    </ScrollArea>
  );
}
